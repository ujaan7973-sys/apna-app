import "react-native-url-polyfill/auto";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, StatusBar, ActivityIndicator, Image, Platform, Dimensions
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { SvgXml } from "react-native-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { captureRef } from "react-native-view-shot";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VideoView, useVideoPlayer } from "expo-video";
import { createClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
import { requireNativeModule } from "expo-modules-core";

const SUPABASE_URL = "https://yuukxqxsawawrtiahmkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_wY74bjbP3xUyD07HuOdeZA_GuMoLtx3";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: typeof localStorage !== "undefined" ? localStorage : undefined }
});

const FILTER_OVERLAYS = { Mono:"rgba(35,35,35,0.42)", Noir:"rgba(8,8,8,0.48)", Sepia:"rgba(150,95,45,0.28)", Warm:"rgba(255,150,45,0.20)", Cool:"rgba(55,145,255,0.20)", Dream:"rgba(190,110,255,0.16)", Vintage:"rgba(180,120,65,0.18)", Sepia:"rgba(150,95,45,0.28)", Fade:"rgba(245,245,255,0.18)", Pink:"rgba(255,70,170,0.18)", Green:"rgba(30,190,125,0.16)", Bright:"rgba(255,245,180,0.13)", Noir:"rgba(10,10,10,0.28)" };
const COLORS = { bg:"#090B16", panel:"#15182A", panel2:"#20243A", text:"#F7F7FF", muted:"#9BA2BD", cyan:"#21D4FD", pink:"#B721FF", purple:"#6C4BFF", line:"#2A2F49" };
const CLIPORA_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#21D4FD"/><stop offset=".55" stop-color="#6C4BFF"/><stop offset="1" stop-color="#FF4DB8"/></linearGradient><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#151A3B"/><stop offset="1" stop-color="#080B18"/></linearGradient></defs><rect x="16" y="16" width="480" height="480" rx="116" fill="url(#bg)" stroke="url(#g)" stroke-width="12"/><path d="M329 131a143 143 0 1 0 0 250" fill="none" stroke="url(#g)" stroke-width="52" stroke-linecap="round"/><path d="M225 183v146l126-73z" fill="url(#g)" stroke="#fff" stroke-opacity=".75" stroke-width="8" stroke-linejoin="round"/><path d="M367 91l14 27 30 6-22 21 4 30-26-15-27 15 5-30-22-21 30-6z" fill="#FFD45B"/><text x="256" y="448" font-family="Arial,sans-serif" font-size="47" font-weight="800" fill="#fff" text-anchor="middle">CLIPORA AI</text></svg>`;

function PrimaryButton({ title, onPress, disabled=false }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && {opacity:.5}]}><Text style={styles.primaryText}>{title}</Text></TouchableOpacity>;
}
function VideoPreview({ uri, fit="contain" }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; });
  return <VideoView player={player} style={styles.preview} nativeControls contentFit={fit} />;
}

export default function App() {
  const [session,setSession]=useState(null);
  const [authMode,setAuthMode]=useState("signup");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [otp,setOtp]=useState("");
  const [otpPending,setOtpPending]=useState(false);
  const [authBusy,setAuthBusy]=useState(false);
  const [authMessage,setAuthMessage]=useState("");
  const [recoveryMode,setRecoveryMode]=useState(false);
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [screen,setScreen]=useState("Home");
  const [asset,setAsset]=useState(null);
  const [mediaKind,setMediaKind]=useState("image");
  const [title,setTitle]=useState("My first edit");
  const [caption,setCaption]=useState("");
  const [captionSize,setCaptionSize]=useState(24);
  const [captionColor,setCaptionColor]=useState("#FFFFFF");
  const [captionPosition,setCaptionPosition]=useState("Bottom");
  const previewRef=useRef(null);
  const [activeTool,setActiveTool]=useState("Filters");
  const [filter,setFilter]=useState("Original");
  const [ratio,setRatio]=useState("Original");
  const [volume,setVolume]=useState(100);
  const [trimStart,setTrimStart]=useState("0");
  const [trimEnd,setTrimEnd]=useState("");
  const [brightness,setBrightness]=useState(0);
  const [contrast,setContrast]=useState(0);
  const [musicTrack,setMusicTrack]=useState(null);
  const [musicSound,setMusicSound]=useState(null);
  const [musicPlaying,setMusicPlaying]=useState(false);
  const [musicVolume,setMusicVolume]=useState(70);
  const [projects,setProjects]=useState([]);
  const [guestProjectsLoaded,setGuestProjectsLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState("Home");
  const [paymentPlan,setPaymentPlan]=useState("pro_monthly");
  const [transactionReference,setTransactionReference]=useState("");
  const [paymentRequests,setPaymentRequests]=useState([]);
  const [paymentBusy,setPaymentBusy]=useState(false);
  const [jazzCheckoutHtml,setJazzCheckoutHtml]=useState("");
  const [profile,setProfile]=useState({full_name:"",username:"",bio:"",avatar_url:""});
  const [profileBusy,setProfileBusy]=useState(false);
  const [aiPrompt,setAiPrompt]=useState("");
  const [aiTask,setAiTask]=useState("caption");
  const [aiResult,setAiResult]=useState("");
  const [aiBusy,setAiBusy]=useState(false);
  const [imageToolBusy,setImageToolBusy]=useState(false);
  const [imageToolPrompt,setImageToolPrompt]=useState("");
  const [exportQuality,setExportQuality]=useState("1080p");
  const isPremium=paymentRequests.some(r=>["approved","verified","paid","active"].includes(String(r.status||"").toLowerCase()));

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive)setSession(data.session);});
    const {data:sub}=supabase.auth.onAuthStateChange((event,next)=>{if(alive){setSession(next);if(event==="PASSWORD_RECOVERY")setRecoveryMode(true);}});
    return ()=>{alive=false;sub.subscription.unsubscribe();};
  },[]);

  useEffect(()=>{ if(session){loadProjects();loadPaymentRequests();loadProfile();} else {setPaymentRequests([]);setProfile({full_name:"",username:"",bio:"",avatar_url:""});AsyncStorage.getItem("clipora_guest_projects").then(raw=>{setProjects(raw?JSON.parse(raw):[]);setGuestProjectsLoaded(true);}).catch(()=>{setProjects([]);setGuestProjectsLoaded(true);});} },[session?.user?.id]);
  useEffect(()=>{if(!session&&guestProjectsLoaded){AsyncStorage.setItem("clipora_guest_projects",JSON.stringify(projects)).catch(()=>{});}},[projects,session?.user?.id,guestProjectsLoaded]);

  const loadProfile=async()=>{
    if(!session?.user?.id)return;
    const {data,error}=await supabase.from("profiles").select("full_name,username,bio,avatar_url").eq("id",session.user.id).maybeSingle();
    if(!error&&data)setProfile({full_name:data.full_name||"",username:data.username||"",bio:data.bio||"",avatar_url:data.avatar_url||""});
  };
  const saveProfile=async()=>{
    if(!session){Alert.alert("Profile saved","Guest profile is available on this device for this session.");return;}
    setProfileBusy(true);
    try{
      const username=profile.username.trim().replace(/[^a-zA-Z0-9_]/g,"").toLowerCase();
      const {error}=await supabase.from("profiles").upsert({id:session.user.id,full_name:profile.full_name.trim(),username:username||null,bio:profile.bio.trim(),avatar_url:profile.avatar_url||null},{onConflict:"id"});
      if(error)throw error;
      setProfile(p=>({...p,username}));
      Alert.alert("Profile saved","Aapki profile update ho gayi.");
    }catch(e){Alert.alert("Profile error",e?.message||"Profile save nahi hui.");}
    finally{setProfileBusy(false);}
  };
  const uploadAvatar=async()=>{
    if(!session){const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert("Permission","Gallery access allow karein.");return;}const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85});if(!picked.canceled&&picked.assets?.length)setProfile(p=>({...p,avatar_url:picked.assets[0].uri}));return;}
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){Alert.alert("Permission","Gallery access allow karein.");return;}
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85});
      if(result.canceled||!result.assets?.length)return;
      setProfileBusy(true);
      const asset=result.assets[0];
      const response=await fetch(asset.uri);
      const body=await response.arrayBuffer();
      const path=session.user.id+"/avatar-"+Date.now()+".jpg";
      const {error}=await supabase.storage.from("clipora-media").upload(path,body,{contentType:"image/jpeg",upsert:false});
      if(error)throw error;
      const {data}=supabase.storage.from("clipora-media").getPublicUrl(path);
      setProfile(p=>({...p,avatar_url:data.publicUrl}));
      Alert.alert("Photo selected","Ab Save Profile dabayein.");
    }catch(e){Alert.alert("Upload error",e?.message||"Profile photo upload nahi hui.");}
    finally{setProfileBusy(false);}
  };

  const loadPaymentRequests=async()=>{
    const {data,error}=await supabase.from("clipora_payment_requests").select("id,plan_code,amount_pkr,transaction_reference,status,created_at").order("created_at",{ascending:false}).limit(10);
    if(!error)setPaymentRequests(data||[]);
  };

  const startJazzCashCheckout=async()=>{
    if(!session){Alert.alert("Login required","JazzCash se Pro lene ke liye pehle account login karein.");setScreen("Auth");return;}
    setPaymentBusy(true);
    try{
      const {data,error}=await supabase.functions.invoke("clipora-jazzcash",{body:{action:"start",plan_code:paymentPlan}});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      if(!data?.paymentPortalUrl||!data?.fields)throw new Error("JazzCash checkout details nahi mile.");
      const escapeHtml=(value)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const inputs=Object.entries(data.fields).map(([name,value])=>'<input type="hidden" name="'+escapeHtml(name)+'" value="'+escapeHtml(value)+'">').join("");
      const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;background:#090B16;color:white;text-align:center;padding:30px"><p>Connecting securely to JazzCash…</p><form id="jc" method="post" action="'+escapeHtml(data.paymentPortalUrl)+'">'+inputs+'<button type="submit">Continue to JazzCash</button></form><script>document.getElementById("jc").submit();</script></body></html>';
      setJazzCheckoutHtml(html);setScreen("JazzCashCheckout");
    }catch(e){Alert.alert("JazzCash checkout",e?.message||"Gateway abhi configure nahi hua.");}
    finally{setPaymentBusy(false);}
  };

  const submitPaymentRequest=async()=>{
    if(!session){Alert.alert("Premium payment","JazzCash payment request bhejne ke liye account login feature abhi enabled nahi. App guest mode mein chal rahi hai.");return;}
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

  const normalizedPhone=(value)=>{
    const digits=value.replace(/[^0-9+]/g,"");
    if(digits.startsWith("+"))return digits;
    if(digits.startsWith("03")&&digits.length===11)return "+92"+digits.slice(1);
    if(digits.startsWith("92"))return "+"+digits;
    return digits;
  };
  const isPhone=(value)=>/^\+?[0-9]{10,15}$/.test(normalizedPhone(value));
  const signIn=async()=>{
    setAuthMessage("");
    const identifier=email.trim();
    if(!identifier){setAuthMessage("Email ya mobile number likhein.");return;}
    if(password.length<6){setAuthMessage("Password kam az kam 6 characters ka hona chahiye.");return;}
    setAuthBusy(true);
    try{
      const phone=isPhone(identifier);
      const result=authMode==="signup"
        ? phone
          ? await supabase.auth.signUp({phone:normalizedPhone(identifier),password})
          : await supabase.auth.signUp({email:identifier.toLowerCase(),password,options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:undefined}})
        : phone
          ? await supabase.auth.signInWithPassword({phone:normalizedPhone(identifier),password})
          : await supabase.auth.signInWithPassword({email:identifier.toLowerCase(),password});
      if(result.error) setAuthMessage(result.error.message==="Invalid login credentials"?"Email ya password match nahi hua. Forgot password dabakar naya password set karein.":result.error.message);
      else if(authMode==="signup"&&!result.data.session){
        if(phone){
          setOtpPending(true);
          setAuthMessage("SMS code bhej diya gaya hai. Code verify karein.");
        } else {
          setAuthMode("login");
          setPassword("");
          setAuthMessage("Account request ho gayi. Apna email inbox khol kar verification link confirm karein, phir Log in karein.");
        }
      } else {
        setSession(result.data.session);
        setScreen("Home");
        setTab("Home");
        setAuthMessage("Login successful.");
      }
    }catch(e){setAuthMessage(e?.message||"Connection error.");}
    finally{setAuthBusy(false);}
  };
  const verifyPhoneOtp=async()=>{
    const phone=normalizedPhone(email.trim());
    if(otp.trim().length<4){setAuthMessage("SMS verification code likhein.");return;}
    setAuthBusy(true);
    try{
      const {data,error}=await supabase.auth.verifyOtp({phone,token:otp.trim(),type:"sms"});
      if(error)throw error;
      setSession(data.session);setOtpPending(false);setOtp("");setAuthMessage("Mobile number verified. Welcome to Clipora AI.");
    }catch(e){setAuthMessage(e?.message||"OTP verify nahi hua.");}
    finally{setAuthBusy(false);}
  };
  const socialLogin=async(provider)=>{
    setAuthBusy(true);setAuthMessage("");
    try{
      const redirectTo=Platform.OS==="web"?window.location.origin:"cliporaai://auth/callback";
      const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo,skipBrowserRedirect:Platform.OS!=="web"}});
      if(error)throw error;
      if(Platform.OS!=="web"){
        if(!data?.url)throw new Error("OAuth URL nahi mila. Supabase provider settings check karein.");
        const result=await WebBrowser.openAuthSessionAsync(data.url,redirectTo);
        if(result.type!=="success")throw new Error("Login cancel ya close ho gaya.");
        const callback=new URL(result.url);
        const code=callback.searchParams.get("code");
        if(code){const {error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);if(exchangeError)throw exchangeError;}
        else {
          const params=new URLSearchParams(callback.hash.replace(/^#/,""));
          const access_token=params.get("access_token"),refresh_token=params.get("refresh_token");
          if(!access_token||!refresh_token)throw new Error("OAuth callback token missing hai.");
          const {error:sessionError}=await supabase.auth.setSession({access_token,refresh_token});if(sessionError)throw sessionError;
        }
      }
    }catch(e){setAuthMessage(e?.message||provider+" login setup nahi hai. Supabase mein provider configure karein.");}
    finally{setAuthBusy(false);}
  };
  const saveNewPassword=async()=>{
    if(newPassword.length<8){setAuthMessage("Naya password kam az kam 8 characters ka rakhein.");return;}
    if(newPassword!==confirmPassword){setAuthMessage("Dono passwords match nahi karte.");return;}
    setAuthBusy(true);setAuthMessage("");
    try{
      const {error}=await supabase.auth.updateUser({password:newPassword});
      if(error)throw error;
      setRecoveryMode(false);setNewPassword("");setConfirmPassword("");setPassword("");setAuthMessage("Password update ho gaya. Ab login karein.");
      await supabase.auth.signOut();
    }catch(e){setAuthMessage(e?.message||"Password update nahi hua. Naya reset link mangwayein.");}
    finally{setAuthBusy(false);}
  };
  const resetPassword=async()=>{
    const value=email.trim();
    if(!value||isPhone(value)){setAuthMessage("Password reset ke liye apna registered email likhein.");return;}
    setAuthBusy(true);
    try{
      const {error}=await supabase.auth.resetPasswordForEmail(value.toLowerCase(),{redirectTo:typeof window!=="undefined"?window.location.origin:undefined});
      if(error)throw error;
      setAuthMessage("Password reset link aapke email par bhej diya gaya hai.");
    }catch(e){setAuthMessage(e?.message||"Reset link nahi bheja ja saka.");}
    finally{setAuthBusy(false);}
  };

  const runImageTool=async(task)=>{
    if(!asset?.uri||mediaKind!=="image"){Alert.alert("Photo required","AI tools ke liye pehle photo select karein.");return;}
    if(Platform.OS==="web"){Alert.alert("Android app required","AI image tools Android app mein run honge.");return;}
    if(task==="remove_object"&&!imageToolPrompt.trim()){Alert.alert("Object ka naam likhein","Misal: remove the person in the background.");return;}
    setImageToolBusy(true);
    try{
      const info=await FileSystem.getInfoAsync(asset.uri);
      if(info.exists&&info.size>12*1024*1024)throw new Error("Photo 12 MB se chhoti honi chahiye.");
      const imageBase64=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64});
      const {data,error}=await supabase.functions.invoke("clipora-image-tools",{body:{task,imageBase64,mimeType:asset.mimeType||"image/jpeg",prompt:imageToolPrompt.trim()}});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      if(!data?.imageBase64)throw new Error("AI ne edited image return nahi ki.");
      const outputUri=FileSystem.cacheDirectory+"clipora-ai-"+Date.now()+".png";
      await FileSystem.writeAsStringAsync(outputUri,data.imageBase64,{encoding:FileSystem.EncodingType.Base64});
      setAsset({...asset,uri:outputUri,fileName:"clipora-ai-edited.png",mimeType:"image/png"});
      setFilter("Original");setRatio("Original");setCaption("");
      Alert.alert("AI edit complete",task==="remove_background"?"Background remove ho gaya. PNG transparent background ke sath ready hai.":"AI object removal complete. Result check karein.");
    }catch(e){Alert.alert("AI image tool",e?.message||"Image process nahi ho saki.");}
    finally{setImageToolBusy(false);}
  };

  const generateAiContent=async()=>{
    const prompt=aiPrompt.trim() || caption.trim() || title.trim();
    if(!prompt){Alert.alert("Write a prompt","Video ya photo ke bare mein kuch likhein.");return;}
    setAiBusy(true);setAiResult("");
    try{
      const {data,error}=await supabase.functions.invoke("clipora-ai",{body:{task:aiTask,prompt}});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      if(!data?.text)throw new Error("AI se jawab nahi mila. API key aur Gemini quota check karein.");
      setAiResult(data.text);
      if(aiTask==="rewrite")setCaption(data.text);
    }catch(e){Alert.alert("Clipora AI",e?.message||"AI service se connection nahi ho saka.");}
    finally{setAiBusy(false);}
  };

  const chooseMusic=async()=>{
    try{
      const result=await DocumentPicker.getDocumentAsync({type:"audio/*",copyToCacheDirectory:true});
      if(result.canceled||!result.assets?.length)return;
      if(musicSound){await musicSound.stopAsync().catch(()=>{});await musicSound.unloadAsync().catch(()=>{});}
      const picked=result.assets[0];
      const {sound}=await Audio.Sound.createAsync({uri:picked.uri},{shouldPlay:true,volume:musicVolume/100,isLooping:true});
      sound.setOnPlaybackStatusUpdate(status=>{if(status.isLoaded)setMusicPlaying(!!status.isPlaying);});
      setMusicSound(sound);setMusicTrack({uri:picked.uri,name:picked.name||"Music track"});setMusicPlaying(true);
    }catch(e){Alert.alert("Music import failed",e?.message||"Audio file open nahi ho saki.");}
  };
  const toggleMusic=async()=>{
    if(!musicSound){Alert.alert("Music","Pehle Add Music se audio file select karein.");return;}
    try{const status=await musicSound.getStatusAsync();if(status.isLoaded){if(status.isPlaying)await musicSound.pauseAsync();else await musicSound.playAsync();}}catch(e){Alert.alert("Playback error",e?.message||"Music play nahi hui.");}
  };
  const removeMusic=async()=>{if(musicSound){await musicSound.stopAsync().catch(()=>{});await musicSound.unloadAsync().catch(()=>{});}setMusicSound(null);setMusicTrack(null);setMusicPlaying(false);};

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
    if(!asset?.uri){Alert.alert("Media select karein","Pehle photo ya video choose karein.");return;}
    if(!session){const localItem={id:"local-"+Date.now(),title:title.trim()||"Untitled project",media_type:mediaKind,media_url:asset.uri,settings:{filter,ratio,volume,caption,captionSize,captionColor,captionPosition,musicTrack,musicVolume,trimStart,trimEnd,brightness,contrast,editorVersion:5},created_at:new Date().toISOString()};setProjects(p=>[localItem,...p]);setScreen("Projects");Alert.alert("Saved","Project is device session mein save ho gaya. Cloud sync ke liye account system baad mein add hoga.");return;}
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
      const settings={filter,ratio,volume,caption,captionSize,captionColor,captionPosition,musicTrack,musicVolume,trimStart,trimEnd,brightness,contrast,editorVersion:5};
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

  const openProject=(item)=>{
    const kind=item.media_type==="video"?"video":"image";
    const settings=item.settings||{};
    setAsset({uri:item.media_url,fileName:item.title});
    setMediaKind(kind);
    setTitle(item.title||"My edit");
    setFilter(settings.filter||"Original");
    setRatio(settings.ratio||"Original");
    setVolume(Number(settings.volume??100));
    setMusicTrack(settings.musicTrack||null);
    setMusicVolume(Number(settings.musicVolume??70));
    setTrimStart(String(settings.trimStart??"0"));
    setTrimEnd(String(settings.trimEnd??""));
    setBrightness(Number(settings.brightness??0));
    setContrast(Number(settings.contrast??0));
    setCaption(settings.caption||"");
    setCaptionSize(Number(settings.captionSize||24));
    setCaptionColor(settings.captionColor||"#FFFFFF");
    setCaptionPosition(settings.captionPosition||"Bottom");
    setScreen("Editor");
    setActiveTool("Filters");
  };

  const resetEdits=()=>{
    setFilter("Original");
    setRatio("Original");
    setVolume(100);
    setCaption("");
    setCaptionSize(24);
    setCaptionColor("#FFFFFF");
    setCaptionPosition("Bottom");
    setTrimStart("0");setTrimEnd("");setBrightness(0);setContrast(0);
    Alert.alert("Edits reset","Filter, crop, text aur volume default par aa gaye.");
  };

  const exportPhoto=async()=>{
    if(mediaKind!=="image"||!asset?.uri){Alert.alert("Photo required","Pehle photo select karein.");return;}
    if(Platform.OS!=="web"){
      try{
        if(!previewRef.current)throw new Error("Preview ready nahi hai. Dobara try karein.");
        const permission=await MediaLibrary.requestPermissionsAsync();
        if(!permission.granted)throw new Error("Gallery mein save karne ki permission allow karein.");
        const uri=await captureRef(previewRef,{format:"png",quality:1,result:"tmpfile"});
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("Photo saved","Edited photo aapki phone Gallery mein save ho gayi.");
      }catch(e){Alert.alert("Save failed",e?.message||"Photo Gallery mein save nahi hui.");}
      return;
    }
    try{
      const img=new window.Image();
      img.crossOrigin="anonymous";
      img.src=asset.uri;
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Photo load nahi ho saki."));});
      const ratios={"1:1":1,"4:5":4/5,"9:16":9/16,"16:9":16/9};
      const target=ratios[ratio]||img.width/img.height;
      let sx=0,sy=0,sw=img.width,sh=img.height;
      if(sw/sh>target){sw=sh*target;sx=(img.width-sw)/2;}else{sh=sw/target;sy=(img.height-sh)/2;}
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(sw));canvas.height=Math.max(1,Math.round(sh));
      const ctx=canvas.getContext("2d");
      ctx.filter=filter==="Mono"?"grayscale(1)":filter==="Noir"?"grayscale(1) contrast(1.25)":filter==="Sepia"?"sepia(1)":filter==="Vintage"?"sepia(.45) contrast(.92)":filter==="Fade"?"contrast(.85) brightness(1.08)":filter==="Bright"?"brightness(1.18) saturate(1.12)":filter==="Warm"?"sepia(.18) saturate(1.2) brightness(1.04)":filter==="Cool"?"saturate(1.08) hue-rotate(12deg)":filter==="Pink"?"saturate(1.2) hue-rotate(325deg)":filter==="Green"?"saturate(1.15) hue-rotate(35deg)":filter==="Dream"?"saturate(1.15) brightness(1.08)":"none";
      ctx.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
      ctx.filter="none";
      const tint=FILTER_OVERLAYS[filter]||null;
      if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(caption.trim()){
        const fontSize=Math.max(18,Math.round(captionSize*canvas.width/390));
        ctx.font="900 "+fontSize+"px Arial";
        ctx.textAlign="center";ctx.textBaseline="bottom";
        ctx.lineWidth=Math.max(3,fontSize*0.12);ctx.strokeStyle="rgba(0,0,0,0.85)";
        ctx.fillStyle=captionColor;
        const maxWidth=canvas.width*0.9;
        const words=caption.trim().split(/\s+/);let lines=[],line="";
        for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
        if(line)lines.push(line);
        const lineHeight=fontSize*1.2;const startY=captionPosition==="Top"?fontSize+20:captionPosition==="Center"?(canvas.height-(lines.length-1)*lineHeight)/2:canvas.height-24-(lines.length-1)*lineHeight;
        lines.forEach((txt,i)=>{ctx.strokeText(txt,canvas.width/2,startY+i*lineHeight,maxWidth);ctx.fillText(txt,canvas.width/2,startY+i*lineHeight,maxWidth);});
      }
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
      if(!blob)throw new Error("Image export create nahi hua.");
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=(title.trim()||"clipora-edit")+".png";
      document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
      Alert.alert("Export complete","Edited photo PNG mein save ho gayi.");
    }catch(e){Alert.alert("Export failed",e?.message||"Photo export nahi ho saka.");}
  };

  const chooseExportQuality=(quality)=>{
    if(quality==="2K"&&!isPremium){setPaymentPlan("pro_monthly");setScreen("Premium");Alert.alert("2K is a Pro feature","2K video export unlock karne ke liye Pro upgrade karein.");return;}
    setExportQuality(quality);
  };

  const exportVideo=async()=>{
    if(mediaKind!=="video"||!asset?.uri){Alert.alert("Video required","Pehle video select karein.");return;}
    if(Platform.OS!=="web"){
      if(exportQuality==="2K"&&!isPremium){chooseExportQuality("2K");return;}
      setBusy(true);
      try{
        const NativeRenderer=requireNativeModule("CliporaVideoRenderer");
        const sourceWidth=Number(asset.width)||1920;
        const sourceHeight=Number(asset.height)||1080;
        const outputLongEdge=exportQuality==="2K"?2560:1920;
        const scale=outputLongEdge/Math.max(sourceWidth,sourceHeight);
        const targetAspect=ratio==="1:1"?1:ratio==="4:5"?4/5:ratio==="9:16"?9/16:ratio==="16:9"?16/9:sourceWidth/sourceHeight;
        const targetWidth=Math.max(2,Math.round(((targetAspect>=1?outputLongEdge:outputLongEdge*targetAspect))/2)*2);
        const targetHeight=Math.max(2,Math.round(((targetAspect>=1?outputLongEdge/targetAspect:outputLongEdge))/2)*2);
        const outputPath=FileSystem.cacheDirectory+"clipora-"+Date.now()+".mp4";
        const outputUri=await NativeRenderer.exportVideo(asset.uri,outputPath,targetWidth,targetHeight,filter,ratio,brightness/100,contrast/100,caption,captionColor,captionSize,captionPosition,musicTrack?.uri||"",Math.max(0,Math.round(Number(trimStart||0)*1000)),trimEnd.trim()?Math.max(0,Math.round(Number(trimEnd)*1000)):-1);
        const permission=await MediaLibrary.requestPermissionsAsync();
        if(!permission.granted)throw new Error("Gallery permission allow karein.");
        await MediaLibrary.createAssetAsync(outputUri);
        Alert.alert("Export complete",`Edited video MP4 mein Gallery mein save ho gayi. Output: ${exportQuality}.`);
      }catch(e){
        Alert.alert("Export failed",e?.message||"Native video rendering fail hui. Dobara try karein.");
      }finally{setBusy(false);}
      return;
    }
    if(typeof MediaRecorder==="undefined"){Alert.alert("Browser unsupported","Is browser mein video export supported nahi. Chrome ka latest version try karein.");return;}
    setBusy(true);
    let recorder, video, canvasStream, sourceStream;
    try{
      video=document.createElement("video");
      video.src=asset.uri;
      video.playsInline=true;
      video.muted=false;
      video.volume=Math.max(0,Math.min(1,volume/100));
      video.preload="auto";
      await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(new Error("Video load nahi ho saki."));});
      if(!video.captureStream)throw new Error("Browser original video audio stream export support nahi karta.");
      const ratios={"1:1":1,"4:5":4/5,"9:16":9/16,"16:9":16/9};
      const target=ratios[ratio]||video.videoWidth/video.videoHeight;
      const sourceRatio=video.videoWidth/video.videoHeight;
      let width=video.videoWidth,height=video.videoHeight;
      if(sourceRatio>target)width=Math.round(height*target);else height=Math.round(width/target);
      const canvas=document.createElement("canvas");
      const outputScale=exportQuality==="2K"?(width>=height?Math.max(2560/width,1):Math.max(2560/height,1)):1;
      canvas.width=Math.max(2,Math.round(width*outputScale));canvas.height=Math.max(2,Math.round(height*outputScale));
      const ctx=canvas.getContext("2d");
      canvasStream=canvas.captureStream(30);
      sourceStream=video.captureStream();
      const tracks=[...canvasStream.getVideoTracks(),...sourceStream.getAudioTracks()];
      const stream=new MediaStream(tracks);
      const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
      if(!mime)throw new Error("Is browser mein supported WebM encoder nahi mila.");
      const chunks=[];
      recorder=new MediaRecorder(stream,{mimeType:mime});
      recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
      const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error("Video recording fail ho gayi."));});
      const draw=()=>{
        if(video.paused||video.ended)return;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const sx=(video.videoWidth-width)/2,sy=(video.videoHeight-height)/2;
        ctx.filter=filter==="Mono"?"grayscale(1)":filter==="Noir"?"grayscale(1) contrast(1.25)":filter==="Sepia"?"sepia(1)":filter==="Vintage"?"sepia(.45) contrast(.92)":filter==="Fade"?"contrast(.85) brightness(1.08)":filter==="Bright"?"brightness(1.18) saturate(1.12)":filter==="Warm"?"sepia(.18) saturate(1.2) brightness(1.04)":filter==="Cool"?"saturate(1.08) hue-rotate(12deg)":filter==="Pink"?"saturate(1.2) hue-rotate(325deg)":filter==="Green"?"saturate(1.15) hue-rotate(35deg)":filter==="Dream"?"saturate(1.15) brightness(1.08)":"none";
        ctx.drawImage(video,sx,sy,width,height,0,0,canvas.width,canvas.height);
        ctx.filter="none";
        const tint=FILTER_OVERLAYS[filter]||null;
        if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);}
        if(caption.trim()){
          const size=Math.max(18,Math.round(captionSize*canvas.width/390));
          ctx.font="900 "+size+"px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";
          ctx.lineWidth=Math.max(3,size*.12);ctx.strokeStyle="rgba(0,0,0,.85)";ctx.fillStyle=captionColor;
          const lines=[];let line="";for(const word of caption.trim().split(/\\s+/)){const next=line?line+" "+word:word;if(ctx.measureText(next).width>canvas.width*.9&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
          const lineHeight=size*1.2;const startY=captionPosition==="Top"?size+20:captionPosition==="Center"?(canvas.height-(lines.length-1)*lineHeight)/2:canvas.height-24-(lines.length-1)*lineHeight;
          lines.forEach((txt,i)=>{ctx.strokeText(txt,canvas.width/2,startY+i*lineHeight,canvas.width*.9);ctx.fillText(txt,canvas.width/2,startY+i*lineHeight,canvas.width*.9);});
        }
        requestAnimationFrame(draw);
      };
      recorder.start(250);
      await video.play();
      draw();
      await new Promise(resolve=>{video.onended=resolve;});
      if(recorder.state!=="inactive")recorder.stop();
      await finished;
      const blob=new Blob(chunks,{type:mime});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=(title.trim()||"clipora-video")+".webm";
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      Alert.alert("Export complete","Edited video WebM format mein save ho gayi. Original audio aur selected volume bhi include hain.");
    }catch(e){
      if(recorder&&recorder.state!=="inactive")recorder.stop();
      Alert.alert("Export failed",e?.message||"Video export nahi ho saka.");
    }finally{
      if(video){video.pause();video.removeAttribute("src");video.load();}
      if(canvasStream)canvasStream.getTracks().forEach(t=>t.stop());
      if(sourceStream)sourceStream.getTracks().forEach(t=>t.stop());
      setBusy(false);
    }
  };

  const deleteProject=async(item)=>{
    Alert.alert("Delete project?","Yeh project list se delete ho jayega.",[
      {text:"Cancel",style:"cancel"},
      {text:"Delete",style:"destructive",onPress:async()=>{
        if(String(item.id).startsWith("local-")){setProjects(p=>p.filter(x=>x.id!==item.id));return;}
        const {error}=await supabase.from("clipora_projects").delete().eq("id",item.id);
        if(error)Alert.alert("Error",error.message);else loadProjects();
      }}
    ]);
  };

  const tools=["Filters","Crop","Text","Music","Adjust","Trim","AI Tools"];
  const filters=["Original","Warm","Cool","Mono","Dream","Vintage","Sepia","Fade","Pink","Noir","Bright","Green"];
  const goHome=()=>{setScreen("Home");setAsset(null);};
  const previewWidth=Math.max(240,Math.min(340,Dimensions.get("window").width-40));
  const previewBoxStyle=ratio==="9:16"?{width:Math.round(290*9/16),height:290,alignSelf:"center"}:ratio==="4:5"?{width:232,height:290,alignSelf:"center"}:ratio==="1:1"?{width:290,height:290,alignSelf:"center"}:ratio==="16:9"?{width:previewWidth,height:Math.round(previewWidth*9/16),alignSelf:"center"}:{};

  if(recoveryMode){
    return <SafeAreaView style={styles.container}><StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/><View style={styles.authWrap}><SvgXml xml={CLIPORA_LOGO} width={112} height={112} style={{alignSelf:"center",marginBottom:14}}/><Text style={styles.brand}>Clipora <Text style={styles.brandAI}>AI</Text></Text><Text style={styles.tagline}>SET A NEW PASSWORD</Text><View style={styles.panel}><Text style={styles.heading}>Create new password</Text><Text style={styles.hint}>Email link se account verify ho gaya. Ab naya password set karein.</Text><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="New password (8+ characters)" placeholderTextColor={COLORS.muted} style={styles.input}/><TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirm new password" placeholderTextColor={COLORS.muted} style={styles.input}/>{!!authMessage&&<Text style={styles.message}>{authMessage}</Text>}<PrimaryButton title={authBusy?"Saving...":"Save new password"} onPress={saveNewPassword} disabled={authBusy}/></View></View></SafeAreaView>;
  }

  if(!session && screen==="Auth"){
    return <SafeAreaView style={styles.container}><StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
      <View style={styles.authWrap}>
        <View style={styles.logoMark}><Text style={styles.logoC}>C</Text><Text style={styles.logoPlay}>▶</Text></View>
        <Text style={styles.brand}>Clipora <Text style={styles.brandAI}>AI</Text></Text>
        <Text style={styles.tagline}>Create. Edit. Shine.</Text>
        <View style={styles.panel}>
          <Text style={styles.heading}>{authMode==="login"?"Welcome back":"Create your account"}</Text>
          <TextInput value={email} onChangeText={v=>{setEmail(v);setOtpPending(false);}} autoCapitalize="none" keyboardType="email-address" placeholder="Email or mobile (03XXXXXXXXX)" placeholderTextColor={COLORS.muted} style={styles.input}/>
          {!otpPending&&<TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (6+ characters)" placeholderTextColor={COLORS.muted} style={styles.input}/>}
          {otpPending&&<TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="SMS verification code" placeholderTextColor={COLORS.muted} style={styles.input}/>}
          {!!authMessage&&<Text style={styles.message}>{authMessage}</Text>}
          {otpPending
            ? <PrimaryButton title={authBusy?"Verifying...":"Verify mobile number"} onPress={verifyPhoneOtp} disabled={authBusy}/>
            : <PrimaryButton title={authBusy?"Please wait...":authMode==="login"?"Log in":"Create account"} onPress={signIn} disabled={authBusy}/>}
          {!otpPending&&authMode==="login"&&<TouchableOpacity onPress={resetPassword}><Text style={styles.switchText}>Forgot password?</Text></TouchableOpacity>}
          {!otpPending&&<TouchableOpacity onPress={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMessage("");}}><Text style={styles.switchText}>{authMode==="login"?"New to Clipora? Create account":"Already registered? Log in"}</Text></TouchableOpacity>}
          {!otpPending&&<View style={{marginTop:16}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={()=>socialLogin("google")} disabled={authBusy}><Text style={styles.secondaryText}>Continue with Google</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={()=>socialLogin("facebook")} disabled={authBusy}><Text style={styles.secondaryText}>Continue with Facebook</Text></TouchableOpacity>
          </View>}
          <Text style={styles.hint}>Filhal email aur password se account banayein ya login karein. Mobile OTP ke liye SMS provider, aur Google/Facebook login ke liye provider setup zaroori hai.</Text>
        </View>
        <Text style={styles.smallNote}>Your creative workspace, in your pocket.</Text>
      </View>
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.container}><StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
    <View style={styles.topbar}>
      <TouchableOpacity onPress={goHome} style={styles.brandRow}><SvgXml xml={CLIPORA_LOGO} width={42} height={42}/><Text style={styles.topBrand}>Clipora <Text style={styles.brandAI}>AI</Text></Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen("Profile")}><Text style={styles.avatar}>{(session?.user?.email||session?.user?.phone||"G").slice(0,1).toUpperCase()}</Text></TouchableOpacity>
    </View>

    {screen==="Home"&&<ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>YOUR CREATIVE STUDIO</Text><Text style={styles.hero}>Make something{"\n"}<Text style={styles.heroAccent}>beautiful.</Text></Text>
      <Text style={styles.sub}>Photo aur video editing ek hi jagah.</Text>
      <View style={styles.createGrid}>
        <TouchableOpacity style={[styles.createCard,styles.photoCard]} onPress={()=>chooseMedia("image")}><Text style={styles.cardIcon}>▧</Text><Text style={styles.cardTitle}>Photo Editor</Text><Text style={styles.cardSub}>Crop • Filters • Text</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.createCard,styles.videoCard]} onPress={()=>chooseMedia("video")}><Text style={styles.cardIcon}>▶</Text><Text style={styles.cardTitle}>Video Editor</Text><Text style={styles.cardSub}>Preview • Filters • Text</Text></TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Quick tools</Text>
      <View style={styles.quickGrid}>{["AI Studio","Templates","My Projects","Profile","Premium"].map((x,i)=><TouchableOpacity key={x} style={styles.quickItem} onPress={()=>setScreen(x==="My Projects"?"Projects":x==="Profile"?"Profile":x==="Premium"?"Premium":"AI")}><Text style={styles.quickIcon}>{["✦","▦","▤","●","♛"][i]}</Text><Text style={styles.quickLabel}>{x}</Text></TouchableOpacity>)}</View>
      <View style={styles.tipBox}><Text style={styles.tipTitle}>✨ Clipora AI Studio</Text><Text style={styles.tipText}>AI effects, auto captions aur background tools aglay stages mein connect honge. Abhi photo/video import aur project saving ka base tayyar hai.</Text></View>
    </ScrollView>}

    {screen==="Editor"&&<ScrollView contentContainerStyle={styles.page}>
      <View style={styles.rowBetween}><TouchableOpacity onPress={goHome}><Text style={styles.back}>‹ Back</Text></TouchableOpacity><Text style={styles.editorLabel}>{mediaKind==="image"?"PHOTO EDITOR":"VIDEO EDITOR"}</Text></View>
      <TextInput value={title} onChangeText={setTitle} style={styles.titleInput} placeholder="Project name" placeholderTextColor={COLORS.muted}/>
      <View style={{flexDirection:"row",gap:10,marginBottom:14}}><TouchableOpacity style={[styles.primaryButton,{flex:1,marginTop:0,padding:13}]} onPress={saveProject} disabled={busy||!asset}><Text style={styles.primaryText}>Save Project</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryButton,{flex:1,marginTop:0,padding:13,backgroundColor:"#A52ACB"}]} onPress={mediaKind==="image"?exportPhoto:exportVideo} disabled={busy||!asset}><Text style={styles.primaryText}>{mediaKind==="image"?"Save Photo":"Export Video"}</Text></TouchableOpacity></View>
      <View ref={previewRef} collapsable={false} style={[styles.previewFrame,previewBoxStyle]}>
        {asset?.uri&&(mediaKind==="image"?<Image source={{uri:asset.uri}} style={styles.preview} resizeMode={ratio==="Original"?"contain":"cover"}/>:<VideoPreview uri={asset.uri} fit={ratio==="Original"?"contain":"cover"}/>)}
        {asset?.uri&&filter!=="Original"&&<View pointerEvents="none" style={[styles.filterPreviewOverlay,{backgroundColor:FILTER_OVERLAYS[filter]||"transparent"}]}/>}
        {caption.trim().length>0&&<View pointerEvents="none" style={[styles.captionOverlay,captionPosition==="Top"?{top:20,bottom:undefined}:captionPosition==="Center"?{top:"45%",bottom:undefined}:{bottom:25}]}><Text style={[styles.captionOverlayText,{color:captionColor,fontSize:captionSize}]}>{caption}</Text></View>}
        {!asset&&<Text style={styles.muted}>Select a photo or video to start</Text>}
      </View>
      <View style={styles.toolTabs}>{tools.map(t=><TouchableOpacity key={t} onPress={()=>setActiveTool(t)} style={[styles.toolTab,activeTool===t&&styles.toolTabActive]}><Text style={[styles.toolTabText,activeTool===t&&styles.toolTabTextActive]}>{t}</Text></TouchableOpacity>)}</View>
      {activeTool==="Filters"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Choose a look</Text><View style={styles.chips}>{filters.map(f=><TouchableOpacity key={f} onPress={()=>setFilter(f)} style={[styles.chip,filter===f&&styles.chipOn]}><Text style={styles.chipText}>{f}</Text></TouchableOpacity>)}</View><Text style={styles.hint}>12 filter presets. Selected look preview aur supported export par apply hota hai.</Text></View>}
      {activeTool==="Crop"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Aspect ratio</Text><View style={styles.chips}>{["Original","1:1","4:5","9:16","16:9"].map(x=><TouchableOpacity key={x} onPress={()=>setRatio(x)} style={[styles.chip,ratio===x&&styles.chipOn]}><Text style={styles.chipText}>{x}</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Selected aspect ratio export crop par apply hota hai. Android photo save capture karta hai current preview; browser export applies crop.</Text></View>}
      {activeTool==="Text"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Add text overlay</Text><TextInput value={caption} onChangeText={setCaption} multiline placeholder="Yahan apna text likhein..." placeholderTextColor={COLORS.muted} style={[styles.input,{minHeight:76,textAlignVertical:"top"}]}/><Text style={styles.hint}>Text size</Text><View style={styles.chips}>{[18,24,30,36,44].map(n=><TouchableOpacity key={n} onPress={()=>setCaptionSize(n)} style={[styles.chip,captionSize===n&&styles.chipOn]}><Text style={styles.chipText}>{n}</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Text color</Text><View style={styles.chips}>{[["White","#FFFFFF"],["Yellow","#FFE45E"],["Cyan","#21D4FD"],["Pink","#FF69B4"],["Black","#111111"]].map(([name,color])=><TouchableOpacity key={name} onPress={()=>setCaptionColor(color)} style={[styles.chip,captionColor===color&&styles.chipOn,{backgroundColor:color}]}><Text style={[styles.chipText,{color:color==="#111111"?"#FFFFFF":"#111111"}]}>{name}</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Text position</Text><View style={styles.chips}>{["Top","Center","Bottom"].map(pos=><TouchableOpacity key={pos} onPress={()=>setCaptionPosition(pos)} style={[styles.chip,captionPosition===pos&&styles.chipOn]}><Text style={styles.chipText}>{pos}</Text></TouchableOpacity>)}</View></View>}
      {activeTool==="Music"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Add background music</Text><Text style={styles.hint}>Phone se MP3, M4A, WAV ya supported audio file import karein. Editor mein music preview chalegi.</Text><PrimaryButton title="＋ Add music from phone" onPress={chooseMusic}/>{musicTrack&&<><Text style={styles.projectTitle}>{musicTrack.name}</Text><View style={styles.chips}><TouchableOpacity onPress={toggleMusic} style={styles.chip}><Text style={styles.chipText}>{musicPlaying?"Ⅱ Pause music":"▶ Play music"}</Text></TouchableOpacity><TouchableOpacity onPress={removeMusic} style={styles.chip}><Text style={styles.chipText}>Remove track</Text></TouchableOpacity></View><Text style={styles.hint}>Music preview volume</Text><View style={styles.chips}>{[0,25,50,70,100].map(v=><TouchableOpacity key={v} onPress={async()=>{setMusicVolume(v);if(musicSound)await musicSound.setVolumeAsync(v/100).catch(()=>{});}} style={[styles.chip,musicVolume===v&&styles.chipOn]}><Text style={styles.chipText}>{v}%</Text></TouchableOpacity>)}</View></>}</View>}
      {activeTool==="AI Tools"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>AI Photo Tools</Text><Text style={styles.hint}>Background removal aur object removal sirf photo par apply honge. Original photo ko safe rakhne ke liye result nayi file mein banega.</Text><PrimaryButton title={imageToolBusy?"Processing...":"✦ Remove Background (PNG)"} onPress={()=>runImageTool("remove_background")} disabled={imageToolBusy||mediaKind!=="image"}/><Text style={styles.panelTitle}>Remove an unwanted object</Text><TextInput value={imageToolPrompt} onChangeText={setImageToolPrompt} placeholder="Misal: remove the person on the left" placeholderTextColor={COLORS.muted} style={styles.input}/><PrimaryButton title={imageToolBusy?"Processing...":"✦ Remove Object with AI"} onPress={()=>runImageTool("remove_object")} disabled={imageToolBusy||mediaKind!=="image"}/>{imageToolBusy&&<ActivityIndicator color={COLORS.cyan} style={{marginTop:12}}/>}<Text style={styles.hint}>Background removal requires REMOVE_BG_API_KEY in Supabase secrets. Object removal uses the Gemini image model and GEMINI_API_KEY. No key is stored in the app.</Text></View>}
      {activeTool==="Trim"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Trim video (seconds)</Text><TextInput value={trimStart} onChangeText={setTrimStart} keyboardType="decimal-pad" placeholder="Start seconds (0)" placeholderTextColor={COLORS.muted} style={styles.input}/><TextInput value={trimEnd} onChangeText={setTrimEnd} keyboardType="decimal-pad" placeholder="End seconds (blank = full length)" placeholderTextColor={COLORS.muted} style={styles.input}/><Text style={styles.hint}>Android MP4 export selected start/end time ko apply karega. End ko start se bara rakhein. Preview abhi full source video dikhata hai.</Text></View>}
      {activeTool==="Adjust"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Video brightness</Text><View style={styles.chips}>{[-50,-25,0,25,50].map(v=><TouchableOpacity key={v} onPress={()=>setBrightness(v)} style={[styles.chip,brightness===v&&styles.chipOn]}><Text style={styles.chipText}>{v>0?"+":""}{v}</Text></TouchableOpacity>)}</View><Text style={styles.panelTitle}>Video contrast</Text><View style={styles.chips}>{[-50,-25,0,25,50].map(v=><TouchableOpacity key={v} onPress={()=>setContrast(v)} style={[styles.chip,contrast===v&&styles.chipOn]}><Text style={styles.chipText}>{v>0?"+":""}{v}</Text></TouchableOpacity>)}</View><Text style={styles.panelTitle}>Original video volume</Text><View style={styles.chips}>{[0,25,50,75,100].map(v=><TouchableOpacity key={v} onPress={()=>setVolume(v)} style={[styles.chip,volume===v&&styles.chipOn]}><Text style={styles.chipText}>{v}%</Text></TouchableOpacity>)}</View><Text style={styles.hint}>Android MP4 export applies brightness, contrast, selected crop ratio and Mono/Noir filters. Volume setting is preview-only for now.</Text></View>}
      {mediaKind==="video"&&<View style={styles.toolPanel}><Text style={styles.panelTitle}>Video export quality</Text><View style={styles.chips}><TouchableOpacity onPress={()=>chooseExportQuality("1080p")} style={[styles.chip,exportQuality==="1080p"&&styles.chipOn]}><Text style={styles.chipText}>1080p · Free</Text></TouchableOpacity><TouchableOpacity onPress={()=>chooseExportQuality("2K")} style={[styles.chip,exportQuality==="2K"&&styles.chipOn]}><Text style={styles.chipText}>{isPremium?"2K · Pro ✓":"🔒 2K · Upgrade"}</Text></TouchableOpacity></View><Text style={styles.hint}>{isPremium?"Pro active: 2K render output unlocked. Source video ki original detail se zyada detail create nahi hoti.":"2K export Pro members ke liye locked hai. Upgrade karein aur payment verify hone ke baad unlock hoga."}</Text></View>}
      <PrimaryButton title={busy?"Saving...":"Save Project"} onPress={saveProject} disabled={busy||!asset}/>
      {mediaKind==="image"&&<PrimaryButton title="Export edited photo (PNG)" onPress={exportPhoto} disabled={!asset||busy}/>}
      {mediaKind==="video"&&<><PrimaryButton title={busy?"Exporting video...":`Export edited video (${exportQuality} MP4)`} onPress={exportVideo} disabled={!asset||busy}/><Text style={styles.hint}>Android MP4 export mixes the selected background track with the video audio. Android MP4 export applies trim, crop, brightness, contrast, Mono/Noir, text overlay and background music mix; browser export keeps original audio only.</Text></>}
      <TouchableOpacity onPress={resetEdits} style={styles.secondaryButton}><Text style={styles.secondaryText}>Reset all edits</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>chooseMedia(mediaKind)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Choose different {mediaKind}</Text></TouchableOpacity>
    </ScrollView>}

    {screen==="Projects"&&<ScrollView contentContainerStyle={styles.page}><Text style={styles.heading}>My Projects</Text><Text style={styles.sub}>Your saved Clipora edits.</Text>
      {projects.length===0&&<Text style={styles.empty}>No saved projects yet. Create your first edit.</Text>}
      {projects.map(p=><View key={p.id} style={styles.projectRow}><TouchableOpacity onPress={()=>openProject(p)} style={styles.projectIcon}><Text style={styles.projectIconText}>{p.media_type==="video"?"▶":"▧"}</Text></TouchableOpacity><TouchableOpacity onPress={()=>openProject(p)} style={{flex:1}}><Text style={styles.projectTitle}>{p.title}</Text><Text style={styles.projectMeta}>{(p.media_type||"media").toUpperCase()} • {new Date(p.created_at).toLocaleDateString()}</Text></TouchableOpacity><TouchableOpacity onPress={()=>deleteProject(p)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View>)}
      <PrimaryButton title="Create new edit" onPress={goHome}/>
    </ScrollView>}

    {screen==="AI"&&<ScrollView contentContainerStyle={styles.page}><Text style={styles.eyebrow}>CLIPORA AI STUDIO</Text><Text style={styles.heading}>AI Creator Studio ✦</Text><Text style={styles.sub}>Gemini-powered captions, titles aur hashtags. Apne video ka topic likhein aur generate karein.</Text>
      <View style={styles.toolPanel}>
        <Text style={styles.panelTitle}>What do you want to create?</Text>
        <View style={styles.chips}>{[["caption","Captions"],["title","Titles"],["hashtags","Hashtags"],["rewrite","Improve caption"]].map(([task,label])=><TouchableOpacity key={task} onPress={()=>{setAiTask(task);setAiResult("");}} style={[styles.chip,aiTask===task&&styles.chipOn]}><Text style={styles.chipText}>{label}</Text></TouchableOpacity>)}</View>
        <TextInput value={aiPrompt} onChangeText={setAiPrompt} multiline placeholder="Misal: Karachi beach par sunset DJ video..." placeholderTextColor={COLORS.muted} style={[styles.input,{minHeight:105,textAlignVertical:"top"}]}/>
        <PrimaryButton title={aiBusy?"Creating...":"✦ Generate with Gemini AI"} onPress={generateAiContent} disabled={aiBusy}/>
        {aiBusy&&<ActivityIndicator color={COLORS.cyan} style={{marginTop:12}}/>}
        {!!aiResult&&<View style={{marginTop:16}}><Text style={styles.panelTitle}>Your AI result</Text><Text selectable style={{color:COLORS.text,lineHeight:23}}>{aiResult}</Text><PrimaryButton title="Use as editor caption" onPress={()=>{setCaption(aiResult);setScreen("Editor");}}/><TouchableOpacity onPress={()=>{setAiPrompt(aiResult);}} style={styles.secondaryButton}><Text style={styles.secondaryText}>Use result as next prompt</Text></TouchableOpacity></View>}
      </View>
      <View style={styles.featureRow}><Text style={styles.featureStar}>✓</Text><Text style={styles.featureText}>AI captions, titles and hashtags</Text><Text style={styles.soon}>CONNECTED</Text></View>
      <View style={styles.featureRow}><Text style={styles.featureStar}>＋</Text><Text style={styles.featureText}>Background removal, object removal and AI video rendering</Text><Text style={styles.soon}>NOT YET</Text></View>
      <Text style={styles.hint}>AI text tools are connected. Photo background/object removal are available in the Photo Editor AI Tools tab after their server keys are configured.</Text>
    </ScrollView>}

    
    {screen==="Premium"&&<ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>SUPPORT THE CREATOR</Text><Text style={styles.heading}>Clipora Premium ✦</Text>
      <Text style={styles.sub}>Unlock more creative tools with a paid plan.</Text>
      <View style={styles.premiumCard}><Text style={styles.premiumBadge}>FREE</Text><Text style={styles.planTitle}>Free</Text><Text style={styles.planPrice}>Rs. 0</Text><Text style={styles.planFeature}>• Basic photo and video preview</Text><Text style={styles.planFeature}>• Limited cloud projects</Text></View>
      <View style={[styles.premiumCard,styles.proCard]}><Text style={styles.premiumBadge}>MOST POPULAR</Text><Text style={styles.planTitle}>Pro Monthly</Text><Text style={styles.planPrice}>Rs. 499 <Text style={styles.planPeriod}>/ month</Text></Text><Text style={styles.planFeature}>• Premium templates and effects</Text><Text style={styles.planFeature}>• More cloud projects</Text><Text style={styles.planFeature}>• 2K video export (when supported by device/browser)</Text><Text style={styles.planFeature}>• No-watermark export when export engine is available</Text><TouchableOpacity style={styles.primaryButton} onPress={()=>{setPaymentPlan("pro_monthly");setScreen("Payment");}}><Text style={styles.primaryText}>Continue with JazzCash</Text></TouchableOpacity></View>
      <View style={styles.premiumCard}><Text style={styles.premiumBadge}>YEARLY PLAN</Text><Text style={styles.planTitle}>Pro Yearly</Text><Text style={styles.planPrice}>Rs. 4,999 <Text style={styles.planPeriod}>/ year</Text></Text><Text style={styles.planFeature}>• All Pro features, including 2K export</Text><Text style={styles.planFeature}>• Annual plan</Text><TouchableOpacity style={styles.secondaryButton} onPress={()=>{setPaymentPlan("pro_yearly");setScreen("Payment");}}><Text style={styles.secondaryText}>Continue with JazzCash</Text></TouchableOpacity></View>
      <Text style={styles.hint}>JazzCash Till transfer is manual verification only. Live gateway checkout cannot be enabled until JazzCash issues the official Merchant ID, Password and Integrity Salt. Do not send money until merchant name is verified.</Text>
    </ScrollView>}

    {screen==="Payment"&&<ScrollView contentContainerStyle={styles.page}>
      <TouchableOpacity onPress={()=>setScreen("Premium")}><Text style={styles.back}>‹ Back to Premium</Text></TouchableOpacity>
      <Text style={styles.heading}>JazzCash payment</Text>
      <Text style={styles.sub}>{paymentPlan==="pro_monthly"?"Pro Monthly — Rs. 499":"Pro Yearly — Rs. 4,999"}</Text>
      <View style={styles.premiumCard}>
        <Text style={styles.premiumBadge}>SECURE ONLINE CHECKOUT</Text>
        <Text style={styles.planFeature}>JazzCash mobile account checkout</Text>
        <PrimaryButton title={paymentBusy?"Connecting…":"Pay securely with JazzCash"} onPress={startJazzCashCheckout} disabled={paymentBusy}/>
        <Text style={styles.hint}>Gateway merchant credentials configure hone ke baad JazzCash checkout khulega. Payment status JazzCash ke signed response se verify hoga.</Text>
      </View>
      <View style={styles.premiumCard}>
        <Text style={styles.premiumBadge}>MANUAL PAYMENT FALLBACK</Text>
        <Text selectable style={styles.planPrice}>984417122</Text>
        <Text style={styles.planFeature}>Till ID — payment bhejne se pehle merchant name verify karein.</Text>
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

    {screen==="JazzCashCheckout"&&<View style={{flex:1,backgroundColor:COLORS.bg}}><View style={styles.topbar}><TouchableOpacity onPress={()=>setScreen("Payment")}><Text style={styles.back}>‹ Back</Text></TouchableOpacity><Text style={styles.editorLabel}>JAZZCASH CHECKOUT</Text></View><WebView source={{html:jazzCheckoutHtml}} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled onLoadEnd={(event)=>{if(String(event.nativeEvent.url||"").includes("/functions/v1/clipora-jazzcash")){loadPaymentRequests().then(()=>setScreen("Payment"));}}} onError={()=>Alert.alert("Checkout error","JazzCash page load nahi hui. Dobara try karein.")}/></View>}

    {screen==="Profile"&&<ScrollView contentContainerStyle={styles.page}><Text style={styles.heading}>Your account</Text>{!session&&<PrimaryButton title="Log in / Create account" onPress={()=>setScreen("Auth")}/> }<TouchableOpacity onPress={uploadAvatar} style={styles.profileCircle}>{profile.avatar_url?<Image source={{uri:profile.avatar_url}} style={{width:78,height:78,borderRadius:39}}/>:<Text style={styles.profileLetter}>{(session?.user?.email||session?.user?.phone||"C").slice(0,1).toUpperCase()}</Text>}</TouchableOpacity><Text style={styles.profileEmail}>{session?.user?.email||session?.user?.phone||"Guest mode — no login"}</Text><Text style={styles.sub}>Tap profile photo to change it</Text><TextInput value={profile.full_name} onChangeText={v=>setProfile(p=>({...p,full_name:v}))} placeholder="Your full name" placeholderTextColor={COLORS.muted} style={styles.input}/><TextInput value={profile.username} onChangeText={v=>setProfile(p=>({...p,username:v}))} autoCapitalize="none" placeholder="Username" placeholderTextColor={COLORS.muted} style={styles.input}/><TextInput value={profile.bio} onChangeText={v=>setProfile(p=>({...p,bio:v}))} multiline placeholder="Write your bio..." placeholderTextColor={COLORS.muted} style={[styles.input,{minHeight:90,textAlignVertical:"top"}]}/><PrimaryButton title={profileBusy?"Saving...":"Save Profile"} onPress={saveProfile} disabled={profileBusy}/><PrimaryButton title="My Projects" onPress={()=>setScreen("Projects")}/><Text style={styles.hint}>Guest mode: bina login ke editing use karein.</Text></ScrollView>}

    <View style={styles.bottomNav}>{[["Home","⌂"],["Projects","▤"],["AI","✦"],["Profile","●"]].map(([s,ic])=><TouchableOpacity key={s} onPress={()=>setScreen(s)} style={styles.navItem}><Text style={[styles.navIcon,screen===s&&styles.navActive]}>{ic}</Text><Text style={[styles.navText,screen===s&&styles.navActive]}>{s}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.bg},authWrap:{flex:1,justifyContent:"center",padding:24},logoMark:{alignSelf:"center",width:76,height:76,borderRadius:24,backgroundColor:"#1A1740",borderWidth:1,borderColor:COLORS.pink,alignItems:"center",justifyContent:"center",marginBottom:14},logoC:{fontSize:52,fontWeight:"900",color:COLORS.cyan,lineHeight:58},logoPlay:{position:"absolute",fontSize:17,color:"#FF54C8",right:14,bottom:16},brand:{textAlign:"center",fontSize:34,fontWeight:"900",color:COLORS.text},brandAI:{color:COLORS.cyan},tagline:{textAlign:"center",color:COLORS.muted,marginTop:5,marginBottom:28,letterSpacing:2},panel:{backgroundColor:COLORS.panel,borderRadius:22,padding:20,borderWidth:1,borderColor:COLORS.line},heading:{fontSize:26,fontWeight:"800",color:COLORS.text,marginBottom:10},input:{backgroundColor:COLORS.panel2,borderRadius:12,padding:14,color:COLORS.text,marginTop:10,borderWidth:1,borderColor:COLORS.line},message:{color:"#FFB5D9",marginTop:10},primaryButton:{backgroundColor:COLORS.purple,padding:16,borderRadius:14,alignItems:"center",marginTop:16},primaryText:{color:"white",fontWeight:"800",fontSize:15},switchText:{color:COLORS.cyan,textAlign:"center",marginTop:18,fontWeight:"700"},smallNote:{textAlign:"center",color:COLORS.muted,marginTop:22,fontSize:12},
  topbar:{height:60,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderColor:COLORS.line},brandRow:{flexDirection:"row",alignItems:"center",gap:9},miniLogo:{width:32,height:32,borderRadius:10,backgroundColor:"#282050",alignItems:"center",justifyContent:"center"},miniLogoText:{fontSize:24,fontWeight:"900",color:COLORS.cyan},topBrand:{fontSize:20,fontWeight:"900",color:COLORS.text},avatar:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.purple,color:"white",textAlign:"center",textAlignVertical:"center",fontWeight:"800",overflow:"hidden",paddingTop:7},
  page:{padding:20,paddingBottom:110},eyebrow:{color:COLORS.cyan,fontWeight:"800",fontSize:11,letterSpacing:2,marginTop:10},hero:{fontSize:42,fontWeight:"900",color:COLORS.text,marginTop:12,lineHeight:46},heroAccent:{color:"#C66CFF"},sub:{color:COLORS.muted,fontSize:14,marginTop:4,marginBottom:20},createGrid:{flexDirection:"row",gap:12,marginTop:22},createCard:{flex:1,minHeight:150,borderRadius:20,padding:16,justifyContent:"flex-end",borderWidth:1},photoCard:{backgroundColor:"#171C39",borderColor:"#3C5BBD"},videoCard:{backgroundColor:"#291638",borderColor:"#8A3D9C"},cardIcon:{fontSize:30,color:COLORS.cyan,marginBottom:15},cardTitle:{fontSize:17,fontWeight:"900",color:COLORS.text},cardSub:{fontSize:11,color:"#C0C5DC",marginTop:4},sectionTitle:{color:COLORS.text,fontSize:18,fontWeight:"800",marginTop:28,marginBottom:12},quickGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},quickItem:{width:"48%",backgroundColor:COLORS.panel,borderRadius:14,padding:14,borderWidth:1,borderColor:COLORS.line},quickIcon:{color:COLORS.cyan,fontSize:22},quickLabel:{color:COLORS.text,fontWeight:"700",marginTop:8},tipBox:{backgroundColor:"#17152E",borderRadius:16,padding:16,marginTop:22,borderWidth:1,borderColor:"#49306D"},tipTitle:{color:COLORS.text,fontWeight:"800",fontSize:15},tipText:{color:COLORS.muted,fontSize:12,lineHeight:19,marginTop:7},
  rowBetween:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},back:{color:COLORS.cyan,fontSize:16,fontWeight:"700"},editorLabel:{color:COLORS.muted,fontSize:10,fontWeight:"800",letterSpacing:1.5},titleInput:{color:COLORS.text,fontSize:18,fontWeight:"800",paddingVertical:14},previewFrame:{height:290,backgroundColor:"#03040A",borderRadius:18,overflow:"hidden",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:COLORS.line},preview:{width:"100%",height:"100%"},filterPreviewOverlay:{...StyleSheet.absoluteFillObject},filterWarm:{backgroundColor:"rgba(255,150,45,0.16)"},filterCool:{backgroundColor:"rgba(55,145,255,0.16)"},filterMono:{backgroundColor:"rgba(45,45,45,0.38)"},filterDream:{backgroundColor:"rgba(190,110,255,0.15)"},captionOverlay:{position:"absolute",bottom:25,left:12,right:12,alignItems:"center"},captionOverlayText:{color:"white",fontWeight:"900",fontSize:24,textShadowColor:"black",textShadowRadius:6},muted:{color:COLORS.muted},toolTabs:{flexDirection:"row",justifyContent:"space-between",marginTop:18,borderBottomWidth:1,borderColor:COLORS.line},toolTab:{paddingVertical:12,paddingHorizontal:9,borderBottomWidth:2,borderColor:"transparent"},toolTabActive:{borderColor:COLORS.cyan},toolTabText:{color:COLORS.muted,fontWeight:"700"},toolTabTextActive:{color:COLORS.cyan},toolPanel:{backgroundColor:COLORS.panel,borderRadius:16,padding:16,marginTop:14,borderWidth:1,borderColor:COLORS.line,minHeight:105},panelTitle:{color:COLORS.text,fontWeight:"800",marginBottom:10},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:20,backgroundColor:COLORS.panel2,borderWidth:1,borderColor:COLORS.line},chipOn:{backgroundColor:"#32245B",borderColor:COLORS.pink},chipText:{color:COLORS.text,fontSize:12,fontWeight:"700"},hint:{color:COLORS.muted,fontSize:11,lineHeight:17,marginTop:12},secondaryButton:{padding:14,alignItems:"center",marginTop:10},secondaryText:{color:COLORS.cyan,fontWeight:"700"},captionOverlayText2:{color:"white"},empty:{color:COLORS.muted,marginTop:30,textAlign:"center",lineHeight:22},projectRow:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:COLORS.panel,padding:14,borderRadius:14,marginTop:10,borderWidth:1,borderColor:COLORS.line},projectIcon:{width:42,height:42,borderRadius:12,backgroundColor:"#282050",alignItems:"center",justifyContent:"center"},projectIconText:{color:COLORS.cyan,fontSize:20},projectTitle:{color:COLORS.text,fontWeight:"800"},projectMeta:{color:COLORS.muted,fontSize:10,marginTop:4},deleteText:{color:"#FF7B9D",fontWeight:"700",fontSize:12},premiumCard:{backgroundColor:COLORS.panel,borderRadius:18,padding:18,marginTop:14,borderWidth:1,borderColor:COLORS.line},proCard:{borderColor:COLORS.pink,borderWidth:2},premiumBadge:{color:COLORS.cyan,fontSize:10,fontWeight:"900",letterSpacing:1,marginBottom:8},planTitle:{color:COLORS.text,fontSize:20,fontWeight:"900"},planPrice:{color:COLORS.text,fontSize:24,fontWeight:"900",marginTop:8,marginBottom:12},planPeriod:{fontSize:12,color:COLORS.muted},planFeature:{color:COLORS.muted,fontSize:13,marginTop:7},featureRow:{flexDirection:"row",alignItems:"center",padding:15,backgroundColor:COLORS.panel,borderRadius:14,marginTop:10,borderWidth:1,borderColor:COLORS.line},featureStar:{color:COLORS.cyan,fontSize:20,marginRight:12},featureText:{color:COLORS.text,fontWeight:"700",flex:1},soon:{color:"#D28BFF",fontSize:9,fontWeight:"900"},profileCircle:{width:78,height:78,borderRadius:39,backgroundColor:COLORS.purple,alignItems:"center",justifyContent:"center",alignSelf:"center",marginTop:30},profileLetter:{color:"white",fontSize:36,fontWeight:"900"},profileEmail:{color:COLORS.text,fontWeight:"800",fontSize:16,textAlign:"center",marginTop:14},bottomNav:{height:65,backgroundColor:"#101323",borderTopWidth:1,borderColor:COLORS.line,flexDirection:"row",justifyContent:"space-around",alignItems:"center"},navItem:{alignItems:"center",justifyContent:"center",minWidth:58},navIcon:{fontSize:20,color:COLORS.muted},navText:{fontSize:10,color:COLORS.muted,marginTop:2},navActive:{color:COLORS.cyan,fontWeight:"900"}
});
