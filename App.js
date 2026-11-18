
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar
} from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function App() {
  const [tab, setTab] = useState("Home");
  const [videos, setVideos] = useState([]);
  const [liked, setLiked] = useState([]);
  const [caption, setCaption] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("English");
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState("");
  const [commentVideo, setCommentVideo] = useState(null);

  const isUrdu = language === "Urdu";

  const chooseVideo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission", "Please allow gallery access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        quality: 1
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  const publishVideo = () => {
    if (!selectedVideo) {
      Alert.alert("APNA", "Please select a video first.");
      return;
    }

    if (!caption.trim()) {
      Alert.alert("APNA", "Please write a caption.");
      return;
    }

    const newVideo = {
      id: Date.now().toString(),
      uri: selectedVideo.uri,
      title: caption.trim(),
      user: "APNA Creator",
      likes: 0
    };

    setVideos(previous => [newVideo, ...previous]);
    setSelectedVideo(null);
    setCaption("");
    setTab("Home");

    Alert.alert("APNA", "Video added to your local feed!");
  };

  const toggleLike = id => {
    setLiked(previous =>
      previous.includes(id)
        ? previous.filter(item => item !== id)
        : [...previous, id]
    );
  };

  const openComments = id => {
    setCommentVideo(id);
    setTab("Comments");
  };

  const addComment = () => {
    if (!commentText.trim() || !commentVideo) return;

    setComments(previous => ({
      ...previous,
      [commentVideo]: [
        ...(previous[commentVideo] || []),
        commentText.trim()
      ]
    }));

    setCommentText("");
  };

  const labels = {
    Home: isUrdu ? "ہوم" : "Home",
    Search: isUrdu ? "تلاش" : "Search",
    Upload: isUrdu ? "اپلوڈ" : "Upload",
    Inbox: isUrdu ? "پیغامات" : "Inbox",
    Profile: isUrdu ? "پروفائل" : "Profile"
  };

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.logo}>APNA</Text>
      <TouchableOpacity
        onPress={() =>
          setLanguage(isUrdu ? "English" : "Urdu")
        }
      >
        <Text style={styles.language}>
          {isUrdu ? "English" : "اردو"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const VideoCard = ({ item }) => (
    <View style={styles.videoCard}>
      <View style={styles.videoPlaceholder}>
        <Text style={styles.playIcon}>▶</Text>
        <Text style={styles.videoLabel}>
          {item.uri ? "VIDEO SELECTED" : "APNA VIDEO"}
        </Text>
        <Text style={styles.videoNote}>
          Video preview will be added in the next stage
        </Text>
      </View>

      <View style={styles.videoDetails}>
        <Text style={styles.username}>@{item.user}</Text>
        <Text style={styles.caption}>{item.title}</Text>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item.id)}>
            <Text style={styles.actionText}>
              {liked.includes(item.id) ? "❤️" : "🤍"}{" "}
              {item.likes + (liked.includes(item.id) ? 1 : 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openComments(item.id)}>
            <Text style={styles.actionText}>
              💬 {comments[item.id]?.length || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (tab === "Home") {
      return (
        <ScrollView style={styles.content}>
          <Text style={styles.heading}>
            {isUrdu ? "آپ کے لیے" : "For You"}
          </Text>

          {videos.length === 0 && (
            <Text style={styles.info}>
              Welcome to APNA! Upload your first video.
            </Text>
          )}

          {videos.map(item => (
            <VideoCard key={item.id} item={item} />
          ))}
        </ScrollView>
      );
    }

    if (tab === "Search") {
      const filtered = videos.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );

      return (
        <ScrollView style={styles.content}>
          <Text style={styles.heading}>Search APNA</Text>

          <TextInput
            style={styles.input}
            placeholder="Search videos..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          {filtered.map(item => (
            <VideoCard key={item.id} item={item} />
          ))}
        </ScrollView>
      );
    }

    if (tab === "Upload") {
      return (
        <ScrollView style={styles.content}>
          <Text style={styles.heading}>Create Video</Text>

          <TextInput
            style={styles.input}
            placeholder="Write your video caption..."
            placeholderTextColor="#999"
            value={caption}
            onChangeText={setCaption}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={chooseVideo}
          >
            <Text style={styles.buttonText}>
              📁 Choose Video from Gallery
            </Text>
          </TouchableOpacity>

          {selectedVideo && (
            <Text style={styles.info}>
              ✅ Video selected:{" "}
              {selectedVideo.fileName || "Ready"}
            </Text>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={publishVideo}
          >
            <Text style={styles.buttonText}>
              🚀 Publish Video
            </Text>
          </TouchableOpacity>

          <Text style={styles.info}>
            Note: This version adds videos to this phone's
            temporary local feed. Online sharing and permanent
            storage will need a backend.
          </Text>
        </ScrollView>
      );
    }

    if (tab === "Inbox") {
      return (
        <View style={styles.content}>
          <Text style={styles.heading}>Inbox</Text>
          <Text style={styles.info}>
            Messages feature is coming soon.
          </Text>
        </View>
      );
    }

    if (tab === "Profile") {
      return (
        <View style={styles.content}>
          <Text style={styles.avatar}>👤</Text>
          <Text style={styles.heading}>APNA Creator</Text>
          <Text style={styles.info}>@myapna</Text>

          <Text style={styles.profileStat}>
            Videos: {videos.length}
          </Text>

          <Text style={styles.heading}>Creator Earnings</Text>
          <Text style={styles.earning}>Rs. 0.00</Text>

          <Text style={styles.info}>
            Real creator earnings require a payment and
            monetization system.
          </Text>
        </View>
      );
    }

    if (tab === "Comments") {
      return (
        <View style={styles.content}>
          <Text style={styles.heading}>Comments</Text>

          <ScrollView style={{ flex: 1 }}>
            {(comments[commentVideo] || []).map((item, index) => (
              <Text key={index} style={styles.comment}>
                👤 {item}
              </Text>
            ))}
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={addComment}
          >
            <Text style={styles.buttonText}>Send Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("Home")}
          >
            <Text style={styles.backText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <Header />

      <View style={styles.main}>
        {renderContent()}
      </View>

      {tab !== "Comments" && (
        <View style={styles.navigation}>
          {Object.keys(labels).map(name => (
            <TouchableOpacity
              key={name}
              style={styles.navItem}
              onPress={() => setTab(name)}
            >
              <Text style={styles.navIcon}>
                {{
                  Home: "🏠",
                  Search: "🔍",
                  Upload: "➕",
                  Inbox: "💬",
                  Profile: "👤"
                }[name]}
              </Text>

              <Text
                style={[
                  styles.navText,
                  tab === name && styles.activeNav
                ]}
              >
                {labels[name]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111"
  },
  header: {
    height: 58,
    backgroundColor: "#191919",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18
  },
  logo: {
    color: "#ff3155",
    fontSize: 28,
    fontWeight: "bold"
  },
  language: {
    color: "white",
    fontSize: 15
  },
  main: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 16
  },
  heading: {
    color: "white",
    fontSize: 23,
    fontWeight: "bold",
    marginBottom: 18
  },
  info: {
    color: "#aaa",
    fontSize: 14,
    marginVertical: 12
  },
  input: {
    backgroundColor: "#292929",
    color: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 15
  },
  primaryButton: {
    backgroundColor: "#ff3155",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 9
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold"
  },
  videoCard: {
    backgroundColor: "#202020",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20
  },
  videoPlaceholder: {
    height: 310,
    backgroundColor: "#292929",
    justifyContent: "center",
    alignItems: "center"
  },
  playIcon: {
    color: "#ff3155",
    fontSize: 45
  },
  videoLabel: {
    color: "white",
    fontWeight: "bold",
    fontSize: 19,
    marginTop: 10
  },
  videoNote: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 8
  },
  videoDetails: {
    padding: 15
  },
  username: {
    color: "#ff3155",
    fontWeight: "bold",
    marginBottom: 8
  },
  caption: {
    color: "white",
    fontSize: 16
  },
  actions: {
    flexDirection: "row",
    gap: 28,
    marginTop: 15
  },
  actionText: {
    color: "white",
    fontSize: 17
  },
  navigation: {
    height: 65,
    backgroundColor: "#191919",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center"
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  navIcon: {
    fontSize: 21
  },
  navText: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 3
  },
  activeNav: {
    color: "#ff3155",
    fontWeight: "bold"
  },
  avatar: {
    fontSize: 65,
    textAlign: "center",
    marginVertical: 15
  },
  profileStat: {
    color: "white",
    fontSize: 18,
    marginVertical: 15
  },
  earning: {
    color: "#20d68b",
    fontSize: 25,
    fontWeight: "bold"
  },
  comment: {
    color: "white",
    backgroundColor: "#292929",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  backText: {
    color: "#ff3155",
    fontSize: 16,
    marginVertical: 15
  }
});
