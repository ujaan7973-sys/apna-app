import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, StatusBar, ActivityIndicator, Image
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yuukxqxsawawrtiahmkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_wY74bjbP3xUyD07HuOdeZA_GuMoLtx3";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: typeof localStorage !== "undefined" ? localStorage : undefined }
});

function FeedVideo({ uri }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; });
  return <VideoView player={player} style={styles.videoPlayer} nativeControls contentFit="contain" />;
}
function Preview({ uri }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; });
  return <VideoView player={player} style={styles.previewPlayer} nativeControls contentFit="contain" />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [tab, setTab] = useState("Home");
  const [videos, setVideos] = useState([]);
  const [liked, setLiked] = useState([]);
  const [caption, setCaption] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [search, setSearch] = useState("");
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState("");
  const [commentVideo, setCommentVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthMessage(error.message);
        return;
      }
      setSession(data.session);
      if (data.session) setTab("Home");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("updatePassword");
        setAuthMessage("Naya password set karein.");
      }
      if (next && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        setTab("Home");
      }
    });
    loadVideos();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadVideos = async () => {
    const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (error) { console.log("APNA feed:", error.message); return; }
    setVideos(data || []);
    if (data?.length) {
      const ids = data.map(v => v.id);
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from("video_likes").select("video_id,user_id").in("video_id", ids),
        supabase.from("video_comments").select("id,video_id,user_id,username,comment,created_at").in("video_id", ids).order("created_at")
      ]);
      setLiked((likeRows || []).filter(x => x.user_id === (session?.user?.id)).map(x => x.video_id));
      const grouped = {};
      (commentRows || []).forEach(c => { grouped[c.video_id] = [...(grouped[c.video_id] || []), c]; });
      setComments(grouped);
      setVideos((data || []).map(v => ({ ...v, likes: (likeRows || []).filter(x => x.video_id === v.id).length })));
    }
  };

  useEffect(() => {
    if (session) {
      loadVideos();
      setProfileName(session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "APNA User");
      setProfileBio(session.user.user_metadata?.bio || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || "");
    }
  }, [session?.user?.id]);

  const authAction = async (mode = authMode) => {
    setAuthMessage("");
    if (!email.trim() || password.length < 6) {
      setAuthMessage("Email likhein aur password kam az kam 6 characters ka rakhein.");
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email: cleanEmail, password })
        : await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (result.error) {
        setAuthMessage(result.error.message);
        return;
      }
      if (mode === "signup" && !result.data.session) {
        setAuthMessage("Account request ho gayi. Email inbox mein confirmation link check karein, verify karke Login dabayein.");
      } else {
        setAuthMessage("Login successful! APNA mein khush aamdeed.");
        setSession(result.data.session);
        if (result.data.session) setTab("Home");
      }
    } catch (e) {
      setAuthMessage(e?.message || "Connection error. Internet check karke dobara koshish karein.");
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    setAuthMessage("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setAuthMessage("Pehle apna email address likhein."); return; }
    setLoading(true);
    try {
      const redirectOptions = typeof window !== "undefined" ? { redirectTo: window.location.origin } : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, redirectOptions);
      if (error) setAuthMessage(error.message);
      else setAuthMessage("Agar is email par account hai to password reset link bhej diya gaya hai. Inbox aur Spam folder check karein.");
    } catch (e) {
      setAuthMessage(e?.message || "Reset email nahi bheji ja saki. Dobara koshish karein.");
    } finally { setLoading(false); }
  };

  const saveNewPassword = async () => {
    setAuthMessage("");
    if (newPassword.length < 6) { setAuthMessage("Naya password kam az kam 6 characters ka hona chahiye."); return; }
    if (newPassword !== confirmNewPassword) { setAuthMessage("Dono passwords match nahi karte."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) setAuthMessage(error.message);
      else {
        setPassword(""); setNewPassword(""); setConfirmNewPassword("");
        setAuthMode("login");
        setAuthMessage("Password update ho gaya. Ab naye password se login karein.");
        await supabase.auth.signOut();
      }
    } catch (e) {
      setAuthMessage(e?.message || "Password update nahi ho saka. Reset link dobara mangwayein.");
    } finally { setLoading(false); }
  };

  const chooseVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Permission", "Gallery permission allow karein."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (!result.canceled && result.assets?.length) setSelectedVideo(result.assets[0]);
  };

  const publishVideo = async () => {
    if (!session) { Alert.alert("Login required", "Video upload karne ke liye pehle login karein."); setTab("Profile"); return; }
    if (!selectedVideo?.uri || !caption.trim()) { Alert.alert("APNA", "Video select karein aur caption likhein."); return; }
    setLoading(true);
    try {
      const asset = selectedVideo;
      const ext = (asset.fileName || asset.uri.split("?")[0]).split(".").pop() || "mp4";
      const path = session.user.id + "/" + Date.now() + "." + ext;
      const response = await fetch(asset.uri);
      const body = await response.arrayBuffer();
      const contentType = asset.mimeType || "video/mp4";
      const { error: uploadError } = await supabase.storage.from("apna-videos").upload(path, body, { contentType, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("apna-videos").getPublicUrl(path);
      const { error: rowError } = await supabase.from("videos").insert({
        user_id: session.user.id,
        username: session.user.email?.split("@")[0] || "APNA Creator",
        caption: caption.trim(),
        video_path: path,
        video_url: publicData.publicUrl
      });
      if (rowError) throw rowError;
      setSelectedVideo(null); setCaption(""); setTab("Home");
      await loadVideos();
      Alert.alert("APNA", "Video public feed mein upload ho gayi!");
    } catch (e) {
      Alert.alert("Upload failed", e.message || "Video upload nahi ho saki. Supabase SQL setup aur login check karein.");
    } finally { setLoading(false); }
  };

  const toggleLike = async id => {
    if (!session) { Alert.alert("Login required", "Like karne ke liye login karein."); return; }
    const already = liked.includes(id);
    const result = already
      ? await supabase.from("video_likes").delete().eq("video_id", id).eq("user_id", session.user.id)
      : await supabase.from("video_likes").insert({ video_id: id, user_id: session.user.id });
    if (result.error) Alert.alert("Like error", result.error.message);
    else { setLiked(old => already ? old.filter(x => x !== id) : [...old, id]); setVideos(old => old.map(v => v.id === id ? { ...v, likes: Math.max(0, (v.likes || 0) + (already ? -1 : 1)) } : v)); }
  };

  const openComments = id => { setCommentVideo(id); setTab("Comments"); };
  const addComment = async () => {
    if (!session) { Alert.alert("Login required", "Comment ke liye login karein."); return; }
    if (!commentText.trim()) return;
    const { error } = await supabase.from("video_comments").insert({
      video_id: commentVideo, user_id: session.user.id,
      username: session.user.email?.split("@")[0] || "APNA User", comment: commentText.trim()
    });
    if (error) Alert.alert("Comment error", error.message);
    else { setCommentText(""); await loadVideos(); }
  };

  const VideoCard = ({ item }) => (
    <View style={styles.videoCard}>
      <FeedVideo uri={item.video_url} />
      <View style={styles.videoDetails}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.caption}>{item.caption}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item.id)}><Text style={styles.actionText}>{liked.includes(item.id) ? "❤️" : "🤍"} {item.likes || 0}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => openComments(item.id)}><Text style={styles.actionText}>💬 {(comments[item.id] || []).length}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (tab === "Home" || tab === "Search") {
      const list = tab === "Search" ? videos.filter(v => (v.caption || "").toLowerCase().includes(search.toLowerCase())) : videos;
      return <ScrollView style={styles.content}>
        <Text style={styles.heading}>{tab === "Home" ? "APNA • Public Videos" : "Search APNA"}</Text>
        {tab === "Search" && <TextInput style={styles.input} placeholder="Search videos..." placeholderTextColor="#999" value={search} onChangeText={setSearch} />}
        {list.length === 0 && <Text style={styles.info}>Abhi public videos nahi hain. Pehli video upload karein!</Text>}
        {list.map(v => <VideoCard key={v.id} item={v} />)}
        <TouchableOpacity onPress={loadVideos} style={styles.secondaryButton}><Text style={styles.buttonText}>↻ Refresh Feed</Text></TouchableOpacity>
      </ScrollView>;
    }
    if (tab === "Upload") return <ScrollView style={styles.content}>
      <Text style={styles.heading}>Public Video Upload</Text>
      {!session && <Text style={styles.info}>Upload se pehle Profile mein account banayein ya login karein.</Text>}
      <TextInput style={styles.input} placeholder="Video caption..." placeholderTextColor="#999" value={caption} onChangeText={setCaption} />
      <TouchableOpacity style={styles.primaryButton} onPress={chooseVideo}><Text style={styles.buttonText}>📁 Gallery se video chunein</Text></TouchableOpacity>
      {selectedVideo?.uri && <View style={styles.selectedBox}><Preview uri={selectedVideo.uri} /><Text style={styles.smallInfo}>{selectedVideo.fileName || "Video selected"}</Text></View>}
      <TouchableOpacity style={styles.primaryButton} onPress={publishVideo} disabled={loading}><Text style={styles.buttonText}>{loading ? "Uploading..." : "🌍 Publish Public Video"}</Text></TouchableOpacity>
      <Text style={styles.smallInfo}>Public videos APNA ke sab users ko nazar aayengi.</Text>
    </ScrollView>;
    if (tab === "Profile") return <ScrollView style={styles.content}>
      <Text style={styles.heading}>My APNA Profile</Text>
      {session ? <>
        {avatarUrl ? <Image source={{uri:avatarUrl}} style={styles.profilePhoto} /> : <Text style={styles.avatar}>👤</Text>}
        <Text style={styles.info}>{session.user.email}</Text>
        <TextInput style={styles.input} placeholder="Apna naam likhein" placeholderTextColor="#999" value={profileName} onChangeText={setProfileName} />
        <TextInput style={[styles.input,{minHeight:90}]} placeholder="Apni bio likhein..." placeholderTextColor="#999" multiline value={profileBio} onChangeText={setProfileBio} />
        <TouchableOpacity style={styles.primaryButton} onPress={async () => {
          setLoading(true);
          const {error} = await supabase.auth.updateUser({data:{display_name:profileName.trim(),bio:profileBio.trim()}});
          setLoading(false);
          Alert.alert("APNA", error ? error.message : "Profile save ho gayi!");
        }} disabled={loading}><Text style={styles.buttonText}>{loading ? "Saving..." : "Save Profile"}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) { Alert.alert("Permission","Gallery permission allow karein."); return; }
          const pick = await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:0.8});
          if (pick.canceled || !pick.assets?.length) return;
          setLoading(true);
          try {
            const a = pick.assets[0];
            const ext = (a.fileName || a.uri.split("?")[0]).split(".").pop() || "jpg";
            const path = session.user.id + "/avatar-" + Date.now() + "." + ext;
            const response = await fetch(a.uri);
            const body = await response.arrayBuffer();
            const {error:upErr} = await supabase.storage.from("apna-videos").upload(path,body,{contentType:a.mimeType || "image/jpeg",upsert:true});
            if (upErr) throw upErr;
            const url = supabase.storage.from("apna-videos").getPublicUrl(path).data.publicUrl;
            const {error:metaErr} = await supabase.auth.updateUser({data:{avatar_url:url}});
            if (metaErr) throw metaErr;
            setAvatarUrl(url);
            Alert.alert("APNA","Profile picture update ho gayi!");
          } catch(e) { Alert.alert("Upload error",e.message || "Picture upload nahi hui."); }
          finally { setLoading(false); }
        }}><Text style={styles.buttonText}>📷 Change Profile Picture</Text></TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={async () => { await supabase.auth.signOut(); setVideos([]); setTab("Profile"); }}><Text style={styles.buttonText}>Logout</Text></TouchableOpacity>
      </> : <>
        <Text style={styles.avatar}>👑</Text>
        {authMode === "updatePassword" ? <>
          <Text style={styles.info}>Apna naya password do martaba likhein.</Text>
          <TextInput style={styles.input} placeholder="New password (at least 6 characters)" placeholderTextColor="#999" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor="#999" secureTextEntry value={confirmNewPassword} onChangeText={setConfirmNewPassword} />
          <TouchableOpacity style={styles.primaryButton} onPress={saveNewPassword} disabled={loading}><Text style={styles.buttonText}>{loading ? "Saving..." : "Save New Password"}</Text></TouchableOpacity>
        </> : <>
          <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#999" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {authMode !== "forgot" && <TextInput style={styles.input} placeholder="Password (at least 6 characters)" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} />}
          {authMode === "forgot" ? <>
            <TouchableOpacity style={styles.primaryButton} onPress={sendPasswordReset} disabled={loading}><Text style={styles.buttonText}>{loading ? "Sending..." : "Send Reset Link"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setAuthMode("login"); setAuthMessage(""); }}><Text style={styles.switchText}>← Back to Login</Text></TouchableOpacity>
          </> : <>
            <TouchableOpacity style={styles.primaryButton} onPress={() => authAction("login")} disabled={loading}><Text style={styles.buttonText}>{loading ? "Please wait..." : "Login"}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton,{backgroundColor:"#343044",opacity:loading?0.65:1}]} onPress={() => authAction("signup")} disabled={loading}><Text style={styles.buttonText}>{loading ? "Account ban raha hai..." : "Create New Account"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setAuthMode("forgot"); setAuthMessage(""); }}><Text style={styles.switchText}>Forgot Password?</Text></TouchableOpacity>
          </>}
        </>}
        {authMessage ? <Text style={styles.info}>{authMessage}</Text> : null}
      </>}
      <Text style={styles.smallInfo}>APNA public video community</Text>
    </ScrollView>;
    if (tab === "Inbox") return <View style={styles.content}><Text style={styles.heading}>Inbox</Text><Text style={styles.info}>Messages feature next update mein aayega.</Text></View>;
    if (tab === "Comments") return <View style={styles.content}>
      <Text style={styles.heading}>Comments</Text>
      <ScrollView style={{ flex: 1 }}>{(comments[commentVideo] || []).map(c => <Text key={c.id} style={styles.comment}>@{c.username}: {c.comment}</Text>)}</ScrollView>
      <TextInput style={styles.input} placeholder="Comment likhein..." placeholderTextColor="#999" value={commentText} onChangeText={setCommentText} />
      <TouchableOpacity style={styles.primaryButton} onPress={addComment}><Text style={styles.buttonText}>Send Comment</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTab("Home")}><Text style={styles.switchText}>← Back to Home</Text></TouchableOpacity>
    </View>;
  };

  return <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor="#101018" />
    <View style={styles.header}><Text style={styles.logo}>👑 APNA</Text><Text style={styles.tagline}>WATCH • CREATE • SHARE</Text></View>
    <View style={styles.main}>{renderContent()}</View>
    {tab !== "Comments" && <View style={styles.navigation}>
      {["Home","Search","Upload","Inbox","Profile"].map(name => <TouchableOpacity key={name} style={styles.navItem} onPress={() => setTab(name)}>
        <Text style={styles.navIcon}>{{Home:"🏠",Search:"🔍",Upload:"➕",Inbox:"💬",Profile:"👤"}[name]}</Text>
        <Text style={[styles.navText, tab === name && styles.activeNav]}>{name}</Text>
      </TouchableOpacity>)}
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#101018"},header:{height:62,backgroundColor:"#191326",flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:16},logo:{color:"#ff39d4",fontSize:26,fontWeight:"900"},tagline:{color:"#ddd",fontSize:10,letterSpacing:1},main:{flex:1},content:{flex:1,padding:16},heading:{color:"white",fontSize:22,fontWeight:"bold",marginBottom:16},info:{color:"#bbb",fontSize:14,marginVertical:16,textAlign:"center"},smallInfo:{color:"#999",fontSize:12,marginVertical:10,lineHeight:18},input:{backgroundColor:"#292536",color:"white",padding:15,borderRadius:10,marginBottom:14,fontSize:15},primaryButton:{backgroundColor:"#b51bdb",padding:15,borderRadius:10,alignItems:"center",marginVertical:9},secondaryButton:{backgroundColor:"#343044",padding:13,borderRadius:10,alignItems:"center",marginVertical:10},buttonText:{color:"white",fontSize:15,fontWeight:"bold"},videoCard:{backgroundColor:"#20202a",borderRadius:12,overflow:"hidden",marginBottom:20},videoPlayer:{width:"100%",height:390,backgroundColor:"#000"},previewPlayer:{width:"100%",height:240,backgroundColor:"#000"},videoDetails:{padding:14},username:{color:"#ff62dc",fontWeight:"bold",marginBottom:7},caption:{color:"white",fontSize:16},actions:{flexDirection:"row",gap:28,marginTop:14},actionText:{color:"white",fontSize:17},navigation:{height:66,backgroundColor:"#191326",flexDirection:"row",justifyContent:"space-around",alignItems:"center"},navItem:{alignItems:"center",justifyContent:"center",flex:1},navIcon:{fontSize:21},navText:{color:"#aaa",fontSize:11,marginTop:3},activeNav:{color:"#ff39d4",fontWeight:"bold"},avatar:{fontSize:60,textAlign:"center",marginVertical:12},profilePhoto:{width:112,height:112,borderRadius:56,alignSelf:"center",marginVertical:14,borderWidth:3,borderColor:"#ff39d4"},comment:{color:"white",backgroundColor:"#292536",padding:12,borderRadius:8,marginBottom:8},switchText:{color:"#ff62dc",textAlign:"center",fontSize:15,marginVertical:14},selectedBox:{backgroundColor:"#20202a",borderRadius:12,padding:10,marginVertical:10}
});