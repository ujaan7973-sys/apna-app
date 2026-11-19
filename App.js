import "react-native-url-polyfill/auto";
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, StatusBar, ActivityIndicator, Image, Platform
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yuukxqxsawawrtiahmkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_wY74bjbP3xUyD07HuOdeZA_GuMoLtx3";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: typeof localStorage !== "undefined" ? localStorage : undefined }
});

const COLORS = { bg:"#090B16", panel:"#15182A", panel2:"#20243A", text:"#F7F7FF", muted:"#9BA2BD", cyan:"#21D4FD", pink:"#B721FF", purple:"#6C4BFF", line:"#2A2F49" };

function PrimaryButton({ title, onPress, disabled=false }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && {opacity:.5}]}><Text style={styles.primaryText}>{title}</Text></TouchableOpacity>;
}
function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; });
  return <VideoView player={player} style={styles.preview} nativeControls contentFit="contain" />;
}

export default function App() {
  const [session,setSession]=useState(null);
  const [authMode,setAuthMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [authBusy,setAuthBusy]=useState(false);
  const [authMessage,setAuthMessage]=useState("");
  const [screen,setScreen]=useState("Home");
  const [asset,setAsset]=useState(null);
  const [mediaKind,setMediaKind]=useState("image");
  const [title,setTitle]=useState("My first edit");
  const [caption,setCaption]=useState("");
  const [activeTool,setActiveTool]=useState("Filters");
  const [filter,setFilter]=useState("Original");
  const [ratio,setRatio]=useState("Original");
  const [volume,setVolume]=useState(100);
  const [projects,setProjects]=useState([]);
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState("Home");
  const [paymentPlan,setPaymentPlan]=useState("pro_monthly");
  const [transactionReference,setTransactionReference]=useState("");
  const [paymentRequests,setPaymentRequests]=useState([]);
  const [paymentBusy,setPaymentBusy]=useState(false);

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive)setSession(data.session);});
    const {data:sub}=supabase.auth.onAuthStateChange((_event,next)=>{if(alive)setSession(next);});
    return ()=>{alive=false;sub.subscription.unsubscribe();};
  },[]);

  useEffect(()=>{ if(session){loadProjects();loadPaymentRequests();} else {setProjects([]);setPaymentRequests([]);} },[session?.user?.id]);

  const loadPaymentRequests=async()=>{
    const {data,error}=await supabase.from("clipora_payment_requests").select("id,plan_code,amount_pkr,transaction_reference,status,created_at").order("created_at",{ascending:false}).limit(10);
    if(!error)setPaymentRequests(data||[]);
  };

  const submitPaymentRequest=async()=>{
    const reference=transactionReference.trim();
    if(reference.length<5){Alert.alert("Transaction ID required","JazzCash receipt par diya gaya transaction/reference ID likhein.");return;}
    setPaymentBusy(true);
    try{
      const amount=paymentPlan==="pro_monthly"?499:4999;
      const {error}=await supabase.from("clipora_payment_requests").insert({
        user_id:session.user.id,plan_code:paymentPlan,amount_pkr:amount,
        merchant_till_id:"984417122",transaction_reference:reference,status:"pending"
      });
      if(error)throw error;
      setTransactionReference("");
      await loadPaymentRequests();
      Alert.alert("Request submitted","Aapki payment request pending hai. Admin JazzCash Business mein payment verify karega. Verification se pehle Premium active nahi hoga.");
    }catch(e){Alert.alert("Submit failed",e?.message||"Payment request submit nahi hui.");}
    finally{setPaymentBusy(false);}
  };

  const loadProjects=async()=>{
    const {data,error}=await supabase.from("clipora_projects").select("*").order("created_at",{ascending:false}).limit(30);
    if(!error)setProjects(data||[]);
  };

  const signIn=async()=>{
    setAuthMessage("");
    if(!email.trim()||password.length<6){setAuthMessage("Email aur kam az kam 6 characters ka password likhein.");return;}
    setAuthBusy(true);
    try{
      const clean=email.trim().toLowerCase();
      const result=authMode==="signup"
        ? await supabase.auth.signUp({email:clean,password,options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:undefined}})
        : await supabase.auth.signInWithPassword({email:clean,password});
      if(result.error) setAuthMessage(result.error.message);
      else if(authMode==="signup"&&!result.data.session) setAuthMessage("Account request ho gayi. Email verify karke login karein.");
      else {setSession(result.data.session);setAuthMessage("Login successful.");}
    }catch(e){setAuthMessage(e?.message||"Connection error.");}
    finally{setAuthBusy(false);}
  };

  const chooseMedia=async(kind)=>{
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){Alert.alert("Permission","Gallery access allow karein.");return;}
      const result=await ImagePicker.launchImageLibraryAsync({
        mediaTypes:kind==="image"?["images"]:["videos"],
        allowsEditing:kind==="image",
        quality:1,
        videoMaxDuration:180
      });
      if(!result.canceled&&result.assets?.length){
        setAsset(result.assets[0]);setMediaKind(kind);setScreen("Editor");setActiveTool("Filters");
        setTitle(kind==="image"?"My photo edit":"My video edit");
      }
    }catch(e){Alert.alert("Gallery error",e?.message||"Media open nahi ho saka.");}
  };

  const saveProject=async()=>{
    if(!session){Alert.alert("Login required","Project save karne ke liye login karein.");setScreen("Profile");return;}
    if(!asset?.uri){Alert.alert("Media select karein","Pehle photo ya video choose karein.");return;}
    setBusy(true);
    try{
      const ext=(asset.fileName||asset.uri.split("?")[0]).split(".").pop()||(mediaKind==="image"?"jpg":"mp4");
      const path=session.user.id+"/"+Date.now()+"."+ext;
      const response=await fetch(asset.uri);
      const body=await response.arrayBuffer();
      const contentType=asset.mimeType||(mediaKind==="image"?"image/jpeg":"video/mp4");
      const {error:uploadError}=await supabase.storage.from("clipora-media").upload(path,body,{contentType,upsert:false});
      if(uploadError)throw uploadError;
      const {data:publicData}=supabase.storage.from("clipora-media").getPublicUrl(path);
      const settings={filter,ratio,volume,caption,editorVersion:1};
      const {error:rowError}=await supabase.from("clipora_projects").insert({
        user_id:session.user.id,title:title.trim()||"Untitled project",
        media_type:mediaKind,media_path:path,media_url:publicData.publicUrl,settings
      });
      if(rowError)throw rowError;
      await loadProjects();setScreen("Projects");
      Alert.alert("Saved","Project Clipora cloud mein save ho gaya.");
    }catch(e){Alert.alert("Save failed",e?.message||"Project save nahi ho saka.");}
    finally{setBusy(false);}
  };

  const deleteProject=async(item)=>{
    Alert.alert("Delete project?","Yeh project list se delete ho jayega.",[
      {text:"Cancel",style:"cancel"},
      {text:"Delete",style:"destructive",onPress:async()=>{
        const {error}=await supabase.from("clipora_projects").delete().eq("id",item.id);
        if(error)Alert.alert("Error",error.message);else loadProjects();
      }}
    ]);
  };

  const tools=["Filters","Crop","Text","Music","Adjust"];
  const filters=["Original","Warm","Cool","Mono","Dream"];
  const goHome=()=>{setScreen("Home");setAsset(null);};

  if(!session){
    return <SafeAreaView style={styles.container}><StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
      <View style={styles.authWrap}>
        <View style={styles.logoMark}><Text style={styles.logoC}>C</Text><Text style={styles.logoPlay}>▶</Text></View>
        <Text style={styles.brand}>Clipora <Text style={styles.brandAI}>AI</Text></Text>
        <Text style={styles.tagline}>Create. Edit. Shine.</Text>
        <View style={styles.panel}>
          <Text style={styles.heading}>{authMode==="login"?"Welcome back":"Create your account"}</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={COLORS.muted} style={styles.input}/>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (6+ characters)" placeholderTextColor={COLORS.muted} style={styles.input}/>
          {!!authMessage&&<Text style={styles.message}>{authMessage}</Text>}
          <PrimaryButton title={authBusy?"Please wait...":authMode==="login"?"Log in":"Create account"} onPress={signIn} disabled={authBusy}/>
          <TouchableOpacity onPress={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMessage("");}}><Text style={styles.switchText}>{authMode==="login"?"New to Clipora? Create account":"Already registered? Log in"}</Text></TouchableOpacity>
        </View>
        <Text style={styles.smallNote}>Your creative workspace, in your pocket.</Text>
      </View>
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.container}><StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
    <View style={styles.topbar}>
      <TouchableOpacity onPress={goHome} style={styles.brandRow}><View style={styles.miniLogo}><Text style={styles.miniLogoText}>C</Text></View><Text style={styles.topBrand}>Clipora <Text style={styles.brandAI}>AI</Text></Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen("Profile")}><Text style={styles.avatar}>{(session.user.email||"C").slice(0,1).toUpperCase()}</Text></TouchableOpacity>
    </View>

    {screen==="Home"&&<ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>YOUR CREATIVE STUDIO</Text><Text style={styles.hero}>Make something{"\n"}<Text style={styles.heroAccent}>beautiful.</Text></Text>
      <Text style={styles.sub}>Photo aur video editing ek hi jagah.</Text>
      <View style={styles.createGrid}>
        <TouchableOpacity style={[styles.createCard,styles.photoCard]} onPress={()=>chooseMedia("image")}><Text style={styles.cardIcon}>▧</Text><Text style={styles.cardTitle}>Photo Editor</Text><Text style={styles.cardSub}>Crop • Filters • Text</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.createCard,styles.videoCard]} onPress={()=>chooseMedia("video")}><Text style={styles.cardIcon}>▶</Text><Text style={styles.cardTitle}>Video Editor</Text><Text style={styles.cardSub}>Preview • Music • Text</Text></TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Quick tools</Text>
      <View style={styles.quickGrid}>{["AI Studio","Templates","My Projects","Profile","Premium"].map((x,i)=><TouchableOpacity key={x} style={styles.quickItem} onPress={()=>setScreen(x==="My Projects"?"Projects":x==="Profile"?"Profile":x==="Premium"?"Premium":"AI")}><Text style={styles.quickIcon}>{["✦","▦","▤","●","♛"][i]}</Text><Text style={styles.quickLabel}>{x}</Text></TouchableOpacity>)}</View>
      <View style={styles.tipBox}><Text style={styles.tipTitle}>✨ Clipora AI Studio</Text><Text style={styles.tipText}>AI effects, auto captions aur background tools aglay stages mein connect honge. Abhi photo/video import aur project saving ka base tayyar hai.</Text></View>
    </ScrollView>}

    {screen==="Editor"&&<ScrollView contentContainerStyle={styles.page}>
      <View style={styles.rowBetween}><TouchableOpacity onPress={goHome}><Text style={styles.back}>‹ Back</Text></TouchableOpacity><Text style={styles.editorLabel}>{mediaKind==="image"?"PHOTO EDITOR":"VIDEO EDITOR"}</Text></View>
      <TextInput value={title} onChangeText={setTitle} style={styles.titleInput} placeholder="Project name" placeholderTextColor={COLORS.muted}/>
      <View style={styles.previewFrame}>
        {asset?.uri&&(mediaKind==="image"?<Image source={{uri:asset.uri}} style={styles.preview} resizeMode="contain"/>:<VideoPreview uri={asset.uri}/>)}
        {caption.trim().length>0&&<View style={styles.captionOverlay}><Text style={styles.captionOverlayText}>{caption}</Text></View>}
        {!asset&&<Text style={styles.muted}>Select a photo or video to start</Text>}
      </View>
      <View style={styles.toolTabs}>{tools.map(t=><TouchableOpacity key={t} onPress={()=>setActiveTool(t)} style={[styles.toolTab,activeTool===t&&styles.toolTabActive]}><Text style={[styles.toolTabText,activeTool===t&&styles.toolTabTextActive]}>{t}</Text></TouchableOpacity>)}</View>
      {activeTool==="Filters"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Choose a look</Text><View style={styles.chips}>{filters.map(f=><TouchableOpacity key={f} onPress={()=>setFilter(f)} style={[styles.chip,filter===f&&styles.chipOn]}><Text style={styles.chipText}>{f}</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Filter selection project settings mein save hoti hai. Exported filter rendering next editing stage mein add hogi.</Text></View>}
      {activeTool==="Crop"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Aspect ratio</Text><View style={styles.chips}>{["Original","1:1","4:5","9:16","16:9"].map(x=><TouchableOpacity key={x} onPress={()=>setRatio(x)} style={[styles.chip,ratio===x&&styles.chipOn]}><Text style={styles.chipText}>{x}</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Photo picker mein basic crop available hai; custom crop/export controls aglay stage mein add honge.</Text></View>}
      {activeTool==="Text"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Add text overlay</Text><TextInput value={caption} onChangeText={setCaption} placeholder="Type your title..." placeholderTextColor={COLORS.muted} style={styles.input}/></View>}
      {activeTool==="Music"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Music</Text><Text style={styles.hint}>Audio track import aur timeline mixing next stage mein add hogi. Is version mein audio export active nahi hai.</Text></View>}
      {activeTool==="Adjust"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Volume</Text><View style={styles.chips}>{[0,25,50,75,100].map(v=><TouchableOpacity key={v} onPress={()=>setVolume(v)} style={[styles.chip,volume===v&&styles.chipOn]}><Text style={styles.chipText}>{v}%</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Volume setting project ke saath save hogi; final audio rendering abhi enabled nahi.</Text></View>}
      <PrimaryButton title={busy?"Saving...":"Save project to cloud"} onPress={saveProject} disabled={busy||!asset}/>
      <TouchableOpacity onPress={()=>chooseMedia(mediaKind)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Choose different {mediaKind}</Text></TouchableOpacity>
    </ScrollView>}

    {screen==="Projects"&&<ScrollView contentContainerStyle={styles.page}><Text style={styles.heading}>My Projects</Text><Text style={styles.sub}>Your saved Clipora edits.</Text>
      {projects.length===0&&<Text style={styles.empty}>No saved projects yet. Create your first edit.</Text>}
      {projects.map(p=><View key={p.id} style={styles.projectRow}><View style={styles.projectIcon}><Text style={styles.projectIconText}>{p.media_type==="video"?"▶":"▧"}</Text></View><View style={{flex:1}}><Text style={styles.projectTitle}>{p.title}</Text><Text style={styles.projectMeta}>{(p.media_type||"media").toUpperCase()} • {new Date(p.created_at).toLocaleDateString()}</Text></View><TouchableOpacity onPress={()=>deleteProject(p)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View>)}
      <PrimaryButton title="Create new edit" onPress={goHome}/>
    </ScrollView>}

    {screen==="AI"&&<ScrollView contentContainerStyle={styles.page}><Text style={styles.eyebrow}>COMING IN NEXT BUILD</Text><Text style={styles.heading}>AI Studio ✦</Text><Text style={styles.sub}>Smart tools planned for Clipora.</Text>
      {["AI background remover","Auto captions","AI photo enhance","Object remover","Smart video templates"].map(x=><View key={x} style={styles.featureRow}><Text style={styles.featureStar}>✦</Text><Text style={styles.featureText}>{x}</Text><Text style={styles.soon}>PLANNED</Text></View>)}
      <Text style={styles.hint}>In tools ko chalane ke liye AI service aur secure server connection chahiye. Koi fake working button nahi rakha gaya.</Text>
    </ScrollView>}

    
    {screen==="Premium"&&<ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>SUPPORT THE CREATOR</Text><Text style={styles.heading}>Clipora Premium ✦</Text>
      <Text style={styles.sub}>Unlock more creative tools with a paid plan.</Text>
      <View style={styles.premiumCard}><Text style={styles.premiumBadge}>FREE</Text><Text style={styles.planTitle}>Free</Text><Text style={styles.planPrice}>Rs. 0</Text><Text style={styles.planFeature}>• Basic photo and video preview</Text><Text style={styles.planFeature}>• Limited cloud projects</Text></View>
      <View style={[styles.premiumCard,styles.proCard]}><Text style={styles.premiumBadge}>MOST POPULAR</Text><Text style={styles.planTitle}>Pro Monthly</Text><Text style={styles.planPrice}>Rs. 499 <Text style={styles.planPeriod}>/ month</Text></Text><Text style={styles.planFeature}>• Premium templates and effects</Text><Text style={styles.planFeature}>• More cloud projects</Text><Text style={styles.planFeature}>• No-watermark export when export engine is available</Text><TouchableOpacity style={styles.primaryButton} onPress={()=>{setPaymentPlan("pro_monthly");setScreen("Payment");}}><Text style={styles.primaryText}>Continue with JazzCash</Text></TouchableOpacity></View>
      <View style={styles.premiumCard}><Text style={styles.premiumBadge}>YEARLY PLAN</Text><Text style={styles.planTitle}>Pro Yearly</Text><Text style={styles.planPrice}>Rs. 4,999 <Text style={styles.planPeriod}>/ year</Text></Text><Text style={styles.planFeature}>• All Pro features</Text><Text style={styles.planFeature}>• Annual plan</Text><TouchableOpacity style={styles.secondaryButton} onPress={()=>{setPaymentPlan("pro_yearly");setScreen("Payment");}}><Text style={styles.secondaryText}>Continue with JazzCash</Text></TouchableOpacity></View>
      <Text style={styles.hint}>Prices are proposed launch prices, not active charges. Payment gateway, receipts, refunds and verified subscription activation must be connected before accepting money.</Text>
    </ScrollView>}
\n    {screen==="Payment"&&<ScrollView contentContainerStyle={styles.page}>
      <TouchableOpacity onPress={()=>setScreen("Premium")}><Text style={styles.back}>‹ Back to Premium</Text></TouchableOpacity>
      <Text style={styles.heading}>JazzCash payment</Text>
      <Text style={styles.sub}>{paymentPlan==="pro_monthly"?"Pro Monthly — Rs. 499":"Pro Yearly — Rs. 4,999"}</Text>
      <View style={styles.premiumCard}>
        <Text style={styles.premiumBadge}>BUSINESS TILL ID</Text>
        <Text selectable style={styles.planPrice}>984417122</Text>
        <Text style={styles.planFeature}>Merchant: Clipora AI business payment</Text>
        <Text style={styles.hint}>JazzCash app mein merchant/Till payment ka supported option use karein. Payment se pehle merchant name aur amount apni receipt par check karein. Agar app Till ID accept na kare, payment na bhejein.</Text>
      </View>
      <View style={styles.toolPanel}>
        <Text style={styles.panelTitle}>Transaction / Reference ID</Text>
        <TextInput value={transactionReference} onChangeText={setTransactionReference} placeholder="Receipt ka transaction ID" placeholderTextColor={COLORS.muted} style={styles.input} autoCapitalize="characters" />
        <PrimaryButton title={paymentBusy?"Submitting...":"Submit payment for verification"} onPress={submitPaymentRequest} disabled={paymentBusy}/>
        <Text style={styles.hint}>Sirf request submit hogi. Premium tabhi activate hoga jab business account owner payment verify kare. Screenshot ya fake receipt se automatic activation nahi hogi.</Text>
      </View>
      <Text style={styles.sectionTitle}>My payment requests</Text>
      {paymentRequests.length===0?<Text style={styles.empty}>Abhi koi payment request nahi.</Text>:paymentRequests.map(r=><View key={r.id} style={styles.projectRow}><View style={{flex:1}}><Text style={styles.projectTitle}>{r.plan_code==="pro_monthly"?"Pro Monthly":"Pro Yearly"} • Rs. {r.amount_pkr}</Text><Text style={styles.projectMeta}>Ref: {r.transaction_reference}</Text></View><Text style={styles.soon}>{r.status.toUpperCase()}</Text></View>)}
    </ScrollView>}

    {screen==="Profile"&&<ScrollView contentContainerStyle={styles.page}><Text style={styles.heading}>Your account</Text><View style={styles.profileCircle}><Text style={styles.profileLetter}>{(session.user.email||"C").slice(0,1).toUpperCase()}</Text></View><Text style={styles.profileEmail}>{session.user.email}</Text><Text style={styles.sub}>Clipora AI creator</Text><PrimaryButton title="My Projects" onPress={()=>setScreen("Projects")}/><TouchableOpacity style={styles.secondaryButton} onPress={async()=>{await supabase.auth.signOut();setSession(null);}}><Text style={styles.secondaryText}>Log out</Text></TouchableOpacity></ScrollView>}

    <View style={styles.bottomNav}>{[["Home","⌂"],["Projects","▤"],["AI","✦"],["Profile","●"]].map(([s,ic])=><TouchableOpacity key={s} onPress={()=>setScreen(s)} style={styles.navItem}><Text style={[styles.navIcon,screen===s&&styles.navActive]}>{ic}</Text><Text style={[styles.navText,screen===s&&styles.navActive]}>{s}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.bg},authWrap:{flex:1,justifyContent:"center",padding:24},logoMark:{alignSelf:"center",width:76,height:76,borderRadius:24,backgroundColor:"#1A1740",borderWidth:1,borderColor:COLORS.pink,alignItems:"center",justifyContent:"center",marginBottom:14},logoC:{fontSize:52,fontWeight:"900",color:COLORS.cyan,lineHeight:58},logoPlay:{position:"absolute",fontSize:17,color:"#FF54C8",right:14,bottom:16},brand:{textAlign:"center",fontSize:34,fontWeight:"900",color:COLORS.text},brandAI:{color:COLORS.cyan},tagline:{textAlign:"center",color:COLORS.muted,marginTop:5,marginBottom:28,letterSpacing:2},panel:{backgroundColor:COLORS.panel,borderRadius:22,padding:20,borderWidth:1,borderColor:COLORS.line},heading:{fontSize:26,fontWeight:"800",color:COLORS.text,marginBottom:10},input:{backgroundColor:COLORS.panel2,borderRadius:12,padding:14,color:COLORS.text,marginTop:10,borderWidth:1,borderColor:COLORS.line},message:{color:"#FFB5D9",marginTop:10},primaryButton:{backgroundColor:COLORS.purple,padding:16,borderRadius:14,alignItems:"center",marginTop:16},primaryText:{color:"white",fontWeight:"800",fontSize:15},switchText:{color:COLORS.cyan,textAlign:"center",marginTop:18,fontWeight:"700"},smallNote:{textAlign:"center",color:COLORS.muted,marginTop:22,fontSize:12},
  topbar:{height:60,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderColor:COLORS.line},brandRow:{flexDirection:"row",alignItems:"center",gap:9},miniLogo:{width:32,height:32,borderRadius:10,backgroundColor:"#282050",alignItems:"center",justifyContent:"center"},miniLogoText:{fontSize:24,fontWeight:"900",color:COLORS.cyan},topBrand:{fontSize:20,fontWeight:"900",color:COLORS.text},avatar:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.purple,color:"white",textAlign:"center",textAlignVertical:"center",fontWeight:"800",overflow:"hidden",paddingTop:7},
  page:{padding:20,paddingBottom:110},eyebrow:{color:COLORS.cyan,fontWeight:"800",fontSize:11,letterSpacing:2,marginTop:10},hero:{fontSize:42,fontWeight:"900",color:COLORS.text,marginTop:12,lineHeight:46},heroAccent:{color:"#C66CFF"},sub:{color:COLORS.muted,fontSize:14,marginTop:4,marginBottom:20},createGrid:{flexDirection:"row",gap:12,marginTop:22},createCard:{flex:1,minHeight:150,borderRadius:20,padding:16,justifyContent:"flex-end",borderWidth:1},photoCard:{backgroundColor:"#171C39",borderColor:"#3C5BBD"},videoCard:{backgroundColor:"#291638",borderColor:"#8A3D9C"},cardIcon:{fontSize:30,color:COLORS.cyan,marginBottom:15},cardTitle:{fontSize:17,fontWeight:"900",color:COLORS.text},cardSub:{fontSize:11,color:"#C0C5DC",marginTop:4},sectionTitle:{color:COLORS.text,fontSize:18,fontWeight:"800",marginTop:28,marginBottom:12},quickGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},quickItem:{width:"48%",backgroundColor:COLORS.panel,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.line},quickIcon:{color:COLORS.cyan,fontSize:22},quickLabel:{color:COLORS.text,fontWeight:"700",marginTop:8},tipBox:{backgroundColor:"#17152E",borderRadius:16,padding:16,marginTop:22,borderWidth:1,borderColor:"#49306D"},tipTitle:{color:COLORS.text,fontWeight:"800",fontSize:15},tipText:{color:COLORS.muted,fontSize:12,lineHeight:19,marginTop:7},
  rowBetween:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},back:{color:COLORS.cyan,fontSize:16,fontWeight:"700"},editorLabel:{color:COLORS.muted,fontSize:10,fontWeight:"800",letterSpacing:1.5},titleInput:{color:COLORS.text,fontSize:18,fontWeight:"800",paddingVertical:14},previewFrame:{height:290,backgroundColor:"#03040A",borderRadius:18,overflow:"hidden",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:COLORS.line},preview:{width:"100%",height:"100%"},captionOverlay:{position:"absolute",bottom:25,left:12,right:12,alignItems:"center"},captionOverlayText:{color:"white",fontWeight:"900",fontSize:24,textShadowColor:"black",textShadowRadius:6},muted:{color:COLORS.muted},toolTabs:{flexDirection:"row",justifyContent:"space-between",marginTop:18,borderBottomWidth:1,borderColor:COLORS.line},toolTab:{paddingVertical:12,paddingHorizontal:9,borderBottomWidth:2,borderColor:"transparent"},toolTabActive:{borderColor:COLORS.cyan},toolTabText:{color:COLORS.muted,fontWeight:"700"},toolTabTextActive:{color:COLORS.cyan},toolPanel:{backgroundColor:COLORS.panel,borderRadius:16,padding:16,marginTop:14,borderWidth:1,borderColor:COLORS.line,minHeight:105},panelTitle:{color:COLORS.text,fontWeight:"800",marginBottom:10},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:20,backgroundColor:COLORS.panel2,borderWidth:1,borderColor:COLORS.line},chipOn:{backgroundColor:"#32245B",borderColor:COLORS.pink},chipText:{color:COLORS.text,fontSize:12,fontWeight:"700"},hint:{color:COLORS.muted,fontSize:11,lineHeight:17,marginTop:12},secondaryButton:{padding:14,alignItems:"center",marginTop:10},secondaryText:{color:COLORS.cyan,fontWeight:"700"},captionOverlayText2:{color:"white"},empty:{color:COLORS.muted,marginTop:30,textAlign:"center",lineHeight:22},projectRow:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:COLORS.panel,padding:14,borderRadius:14,marginTop:10,borderWidth:1,borderColor:COLORS.line},projectIcon:{width:42,height:42,borderRadius:12,backgroundColor:"#282050",alignItems:"center",justifyContent:"center"},projectIconText:{color:COLORS.cyan,fontSize:20},projectTitle:{color:COLORS.text,fontWeight:"800"},projectMeta:{color:COLORS.muted,fontSize:10,marginTop:4},deleteText:{color:"#FF7B9D",fontWeight:"700",fontSize:12},premiumCard:{backgroundColor:COLORS.panel,borderRadius:18,padding:18,marginTop:14,borderWidth:1,borderColor:COLORS.line},proCard:{borderColor:COLORS.pink,borderWidth:2},premiumBadge:{color:COLORS.cyan,fontSize:10,fontWeight:"900",letterSpacing:1,marginBottom:8},planTitle:{color:COLORS.text,fontSize:20,fontWeight:"900"},planPrice:{color:COLORS.text,fontSize:24,fontWeight:"900",marginTop:8,marginBottom:12},planPeriod:{fontSize:12,color:COLORS.muted},planFeature:{color:COLORS.muted,fontSize:13,marginTop:7},featureRow:{flexDirection:"row",alignItems:"center",padding:15,backgroundColor:COLORS.panel,borderRadius:14,marginTop:10,borderWidth:1,borderColor:COLORS.line},featureStar:{color:COLORS.cyan,fontSize:20,marginRight:12},featureText:{color:COLORS.text,fontWeight:"700",flex:1},soon:{color:"#D28BFF",fontSize:9,fontWeight:"900"},profileCircle:{width:78,height:78,borderRadius:39,backgroundColor:COLORS.purple,alignItems:"center",justifyContent:"center",alignSelf:"center",marginTop:30},profileLetter:{color:"white",fontSize:36,fontWeight:"900"},profileEmail:{color:COLORS.text,fontWeight:"800",fontSize:16,textAlign:"center",marginTop:14},bottomNav:{height:65,backgroundColor:"#101323",borderTopWidth:1,borderColor:COLORS.line,flexDirection:"row",justifyContent:"space-around",alignItems:"center"},navItem:{alignItems:"center",justifyContent:"center",minWidth:58},navIcon:{fontSize:20,color:COLORS.muted},navText:{fontSize:10,color:COLORS.muted,marginTop:2},navActive:{color:COLORS.cyan,fontWeight:"900"}
});
