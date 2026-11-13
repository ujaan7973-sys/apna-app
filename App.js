
import React, { useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, StatusBar
} from "react-native";

const videos = [
  { id: 1, user: "APNA Creator", title: "Welcome to APNA ❤️", likes: 1250, comments: 85 },
  { id: 2, user: "Pakistan Star", title: "My beautiful Pakistan 🇵🇰", likes: 890, comments: 42 },
  { id: 3, user: "Video King", title: "New video is here 🔥", likes: 560, comments: 29 }
];

export default function App() {
  const [tab, setTab] = useState("Home");
  const [items, setItems] = useState(videos);
  const [liked, setLiked] = useState([]);
  const [following, setFollowing] = useState([]);
  const [search, setSearch] = useState("");
  const [caption, setCaption] = useState("");
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState({});
  const [language, setLanguage] = useState("English");

  const urdu = language === "Urdu";
  const t = (en, ur) => urdu ? ur : en;

  const likeVideo = (id) => {
    setLiked(old => old.includes(id)
      ? old.filter(x => x !== id) : [...old, id]);
  };

  const followUser = (name) => {
    setFollowing(old => old.includes(name)
      ? old.filter(x => x !== name) : [...old, name]);
  };

  const addComment = () => {
    if (!comment.trim() || !selected) return;
    setComments(old => ({
      ...old,
      [selected]: [...(old[selected] || []), comment.trim()]
    }));
    setComment("");
  };

  const publish = () => {
    if (!caption.trim()) {
      Alert.alert("APNA", "Please write a video caption.");
      return;
    }
    Alert.alert(
      "APNA Upload",
      "This demo needs video storage and backend connection for real publishing."
    );
  };

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.logo}>APNA</Text>
      <TouchableOpacity
        onPress={() => setLanguage(urdu ? "English" : "Urdu")}>
        <Text style={styles.lang}>{urdu ? "English" : "اردو"}</Text>
      </TouchableOpacity>
    </View>
  );

  const Nav = () => {
    const tabs = [
      ["Home", "🏠"], ["Search", "🔍"], ["Upload", "➕"],
      ["Inbox", "💬"], ["Profile", "👤"]
    ];
    return (
      <View style={styles.nav}>
        {tabs.map(([name, emoji]) => (
          <TouchableOpacity key={name}
            style={styles.navItem} onPress={() => setTab(name)}>
            <Text style={{fontSize: 22}}>{emoji}</Text>
            <Text style={[styles.navText,
              tab === name && styles.activeText]}>
              {t(name, {
                Home:"ہوم", Search:"تلاش", Upload:"اپلوڈ",
                Inbox:"پیغامات", Profile:"پروفائل"
              }[name])}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const VideoCard = ({ item }) => (
    <View style={styles.videoCard}>
      <View style={styles.videoScreen}>
        <Text style={styles.play}>▶</Text>
        <Text style={styles.demoText}>APNA VIDEO</Text>
        <Text style={styles.demoSmall}>
          Video player connects with backend
        </Text>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.username}>@{item.user}</Text>
        <Text style={styles.caption}>{item.title}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => likeVideo(item.id)}>
            <Text style={styles.action}>
              {liked.includes(item.id) ? "❤️" : "🤍"} {item.likes +
                (liked.includes(item.id) ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            setSelected(item.id);
            setTab("Comments");
          }}>
            <Text style={styles.action}>💬 {item.comments +
              (comments[item.id]?.length || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => followUser(item.user)}>
            <Text style={styles.action}>
              {following.includes(item.user) ? "Following ✓" : "+ Follow"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Content = () => {
    if (tab === "Home") {
      return (
        <ScrollView>
          <Text style={styles.heading}>{t("For You", "آپ کے لیے")}</Text>
          {items.map(item => <VideoCard key={item.id} item={item}/>)}
        </ScrollView>
      );
    }

    if (tab === "Search") {
      return (
        <View style={styles.page}>
          <Text style={styles.heading}>{t("Search APNA", "تلاش کریں")}</Text>
          <TextInput style={styles.input} value={search}
            onChangeText={setSearch}
            placeholder="Search creators or videos..."
            placeholderTextColor="#888"/>
          {items.filter(v =>
            (v.user + v.title).toLowerCase().includes(search.toLowerCase())
          ).map(v => <VideoCard key={v.id} item={v}/>)}
        </View>
      );
    }

    if (tab === "Upload") {
      return (
        <View style={styles.page}>
          <Text style={styles.heading}>➕ Upload Video</Text>
          <Text style={styles.info}>Share your creativity with APNA.</Text>
          <TextInput style={styles.input} placeholder="Video caption..."
            placeholderTextColor="#888" value={caption}
            onChangeText={setCaption}/>
          <TouchableOpacity style={styles.primary} onPress={publish}>
            <Text style={styles.primaryText}>Choose & Publish Video</Text>
          </TouchableOpacity>
          <Text style={styles.info}>
            Real video selection and publishing will be enabled after
            connecting video storage.
          </Text>
        </View>
      );
    }

    if (tab === "Inbox") {
      return (
        <View style={styles.page}>
          <Text style={styles.heading}>💬 {t("Inbox", "پیغامات")}</Text>
          <Text style={styles.info}>Your messages will appear here.</Text>
          <Text style={styles.info}>پیغامات کا نظام جلد شامل ہوگا۔</Text>
        </View>
      );
    }

    if (tab === "Profile") {
      return (
        <View style={styles.page}>
          <Text style={styles.avatar}>👤</Text>
          <Text style={styles.heading}>APNA Creator</Text>
          <Text style={styles.info}>@myapna</Text>
          <View style={styles.stats}>
            <Text style={styles.stat}>0{"\n"}Videos</Text>
            <Text style={styles.stat}>0{"\n"}Followers</Text>
            <Text style={styles.stat}>0{"\n"}Following</Text>
          </View>
          <Text style={styles.heading}>💰 Creator Earnings</Text>
          <Text style={styles.earning}>Rs. 0.00</Text>
          <Text style={styles.info}>
            Real earnings require verified monetization,
            eligible views and payment integration.
          </Text>
          <TouchableOpacity style={styles.primary}
            onPress={() => Alert.alert("APNA", "Account settings coming soon.")}>
            <Text style={styles.primaryText}>⚙ Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tab === "Comments") {
      return (
        <View style={styles.page}>
          <Text style={styles.heading}>Comments</Text>
          <ScrollView>
            {(comments[selected] || []).map((c, i) =>
              <Text style={styles.info} key={i}>👤 {c}</Text>
            )}
          </ScrollView>
          <TextInput style={styles.input} value={comment}
            onChangeText={setComment} placeholder="Write a comment..."
            placeholderTextColor="#888"/>
          <TouchableOpacity style={styles.primary} onPress={addComment}>
            <Text style={styles.primaryText}>Post Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("Home")}>
            <Text style={styles.info}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#101010" barStyle="light-content"/>
      <Header/>
      <View style={styles.content}>
        <Content/>
      </View>
      <Nav/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#101010" },
  header: {
    height:60, backgroundColor:"#171717", flexDirection:"row",
    justifyContent:"space-between", alignItems:"center", paddingHorizontal:18
  },
  logo: { color:"#ff3155", fontSize:28, fontWeight:"900", letterSpacing:2 },
  lang: { color:"white", fontSize:16, padding:10 },
  content: { flex:1 },
  heading: { color:"white", fontSize:23, fontWeight:"bold", margin:16 },
  videoCard: { backgroundColor:"#202020", margin:10, borderRadius:14, overflow:"hidden" },
  videoScreen: {
    height:260, backgroundColor:"#30303a", alignItems:"center",
    justifyContent:"center"
  },
  play: { color:"white", fontSize:45 },
  demoText: { color:"white", fontSize:24, fontWeight:"bold", marginTop:12 },
  demoSmall: { color:"#bbb", marginTop:6 },
  videoInfo: { padding:14 },
  username: { color:"#ff526c", fontSize:17, fontWeight:"bold" },
  caption: { color:"white", fontSize:15, marginTop:8 },
  actions: { flexDirection:"row", justifyContent:"space-between", marginTop:15 },
  action: { color:"white", fontSize:15 },
  nav: {
    flexDirection:"row", backgroundColor:"#191919",
    justifyContent:"space-around", paddingVertical:9,
    borderTopWidth:1, borderTopColor:"#333"
  },
  navItem: { alignItems:"center", flex:1 },
  navText: { color:"#aaa", fontSize:10, marginTop:3 },
  activeText: { color:"#ff3155", fontWeight:"bold" },
  page: { flex:1, padding:12 },
  input: {
    backgroundColor:"#292929", color:"white", padding:15,
    borderRadius:10, marginVertical:10, fontSize:16
  },
  primary: {
    backgroundColor:"#ff3155", padding:16,
    borderRadius:10, alignItems:"center", marginVertical:12
  },
  primaryText: { color:"white", fontSize:16, fontWeight:"bold" },
  info: { color:"#bbb", fontSize:15, margin:10, lineHeight:23 },
  avatar: { fontSize:65, textAlign:"center", marginTop:20 },
  stats: { flexDirection:"row", justifyContent:"space-around", margin:25 },
  stat: { color:"white", textAlign:"center", fontSize:16, lineHeight:28 },
  earning: { color:"#39dc8b", fontSize:30, fontWeight:"bold", margin:15 }
});
