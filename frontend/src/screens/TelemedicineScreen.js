import React, { useEffect, useState, useRef } from "react";
import { Alert, ScrollView, Share, StyleSheet, View, Dimensions, Platform } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { FileText, Phone, User, Video, Copy } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useAuth } from "../utils/AuthContext";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";
import { createTelemedicineSession, getBaseURL } from "../api";

// Try to import WebRTC, gracefully handle if it fails
let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, RTCView;
let webRTCAvailable = true;
try {
  console.log('Platform.OS:', Platform.OS);
  // Check if we're on web
  if (Platform.OS === 'web') {
    // Web browser - use native WebRTC
    console.log('Using web native WebRTC');
    RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    RTCSessionDescription = window.RTCSessionDescription;
    RTCIceCandidate = window.RTCIceCandidate;
    mediaDevices = navigator.mediaDevices;
  } else {
    // React Native (iOS/Android) - use react-native-webrtc
    console.log('Using react-native-webrtc');
    const webrtc = require('react-native-webrtc');
    console.log('webrtc object:', webrtc);
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
    RTCView = webrtc.RTCView;
    console.log('mediaDevices:', mediaDevices);
  }
} catch (error) {
  webRTCAvailable = false;
  console.log('WebRTC not available, error:', error);
  console.log('Error stack:', error.stack);
}

const { width } = Dimensions.get('window');

const TelemedicineScreen = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState("");
  const [summaryData, setSummaryData] = useState({});
  const [inCall, setInCall] = useState(false);
  const [session, setSession] = useState(null);
  const [socketStatus, setSocketStatus] = useState(t("telemedicine_status_not_connected"));
  const [socket, setSocket] = useState(null);
  const [localStreamURL, setLocalStreamURL] = useState(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState(null);
  
  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const doctorSummaryRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const buildSummary = async () => {
      const today = new Date().toLocaleDateString();
      const water = await AsyncStorage.getItem(`water_${today}`);
      const bpLogs = await AsyncStorage.getItem("bp_logs");
      const bmi = await AsyncStorage.getItem("user_bmi");
      const latestBp = bpLogs ? JSON.parse(bpLogs)[0] : null;
      const data = {
        date: today,
        bmi: bmi || t("not_available"),
        latest_bp: latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : t("not_available"),
        water_today: `${water || 0} ${t("glasses")}`,
      };
      setSummaryData(data);
      setSummary(
        [
          `${t("telemedicine_summary_patient")} ${user?.name || t("telemedicine_summary_user")}`,
          `${t("telemedicine_summary_date")} ${data.date}`,
          `${t("telemedicine_summary_bmi")} ${data.bmi}`,
          `${t("telemedicine_summary_latest_bp")} ${data.latest_bp}`,
          `${t("telemedicine_summary_water_today")} ${data.water_today}`,
          t("telemedicine_summary_note"),
        ].join("\n"),
      );
    };
    buildSummary();
  }, [user]);

  const startSession = async () => {
    try {
      if (!webRTCAvailable || !mediaDevices) {
        let errorMsg = "WebRTC is not available in this environment. ";
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          errorMsg += "On mobile, this feature requires a custom development build (not Expo Go). Please use 'expo run:android' or 'expo run:ios', or create an EAS Build.";
        } else {
          errorMsg += "Please try on a modern web browser with camera and microphone permissions.";
        }
        Alert.alert(
          t("telemedicine_error"),
          errorMsg,
        );
        return;
      }

      const response = await createTelemedicineSession({
        patient_id: user?.id,
        patient_name: user?.name,
        health_summary: summaryData,
      });
      setSession(response);
      doctorSummaryRef.current = response.doctor_summary;  // Store in ref
      setInCall(true);

      // Get local media
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;

      // Attach local stream to video element (web only)
      if (Platform.OS === 'web' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      } else if (Platform.OS !== 'web' && typeof stream.toURL === 'function') {
        setLocalStreamURL(stream.toURL());
      }

      // Setup peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };
      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Add local tracks
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });

      // Handle remote tracks
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          // Attach remote stream to video element (web only)
          // Only set srcObject once to avoid AbortError from multiple track events
          if (Platform.OS === 'web' && remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== event.streams[0]) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          } else if (Platform.OS !== 'web' && typeof event.streams[0].toURL === 'function') {
            setRemoteStreamURL(event.streams[0].toURL());
          }
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate
          }));
        }
      };

      // Connect to signaling server
      const wsBaseURL = getBaseURL().replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBaseURL}/telemedicine/ws/${response.room_id}/patient`);
      socketRef.current = ws;  // Store in ref
      ws.onopen = () => {
        setSocketStatus(t("telemedicine_status_connected") + ", waiting for doctor...");
      };
      ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log('Received from signaling:', data);
            
            // If we just joined and there are existing participants (e.g., doctor already there)
            if (data.type === 'joined' && data.existing_participants && data.existing_participants.length > 0) {
                // Send patient-ready right away if doctor is already in the room
                ws.send(JSON.stringify({
                    type: "patient-ready",
                    summary: doctorSummaryRef.current,
                }));
            }
            
            // If a new participant joined (e.g., doctor just joined)
            if (data.type === 'participant-joined' && data.participant === 'doctor') {
                // Send patient-ready now that doctor is here
                ws.send(JSON.stringify({
                    type: "patient-ready",
                    summary: doctorSummaryRef.current,
                }));
                setSocketStatus('Doctor joined, sending summary...');
            }
            
            if (data.from === 'doctor') {
                if (data.payload.type === 'offer') {
                    await handleOffer(data.payload.offer);
                } else if (data.payload.type === 'ice-candidate' && peerConnectionRef.current) {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
                }
            }
            setSocketStatus(
                t("telemedicine_status_signal_received", {
                    signal: data.type || t("telemedicine_status_signal_message"),
                }),
            );
        };
      ws.onerror = () => setSocketStatus(t("telemedicine_status_error"));
      ws.onclose = () => setSocketStatus(t("telemedicine_status_closed"));
      setSocket(ws);
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert(
        t("telemedicine_error"),
        error.response?.data?.detail || error.message,
      );
    }
  };

  const handleOffer = async (offer) => {
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socketRef.current.send(JSON.stringify({
        type: 'answer',
        answer: answer
      }));
      setSocketStatus('Answer sent, waiting for connection');
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const endSession = () => {
    if (socket) socket.close();
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setSocket(null);
    setInCall(false);
    setLocalStreamURL(null);
    setRemoteStreamURL(null);
    setSocketStatus(t("telemedicine_status_not_connected"));
  };

  const shareSummary = async () => {
    try {
      await Share.share({
        title: t("telemedicine_share_title"),
        message: summary,
      });
    } catch (error) {
      Alert.alert(t("error"), error.message);
    }
  };

  const copyRoomId = async () => {
    try {
      if (session?.room_id) {
        await Share.share({
          message: session.room_id,
        });
        Alert.alert(t("telemedicine_share_title"), t("Room ID shared!"));
      }
    } catch (error) {
      Alert.alert(t("error"), error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Video size={34} color={COLORS.telemedicine} />
            <View style={styles.titleText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t("telemedicine_screen_title")}
              </Text>
              <Text style={styles.subtitle}>
                {t("telemedicine_screen_subtitle")}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.videoCard}>
        <Card.Content style={styles.videoContent}>
          {/* Room ID is hidden since it's a fixed direct call */}
            {session?.room_id && (
              <View style={styles.roomIdContainer}>
                <Text style={styles.roomIdText}>Direct call ready! Waiting for doctor...</Text>
              </View>
            )}
          
          {/* Video elements */}
          <View style={styles.videoContainer}>
            {inCall && (
              <>
                {/* Local video */}
                <View style={styles.videoWrapperLocal}>
                  <Text style={styles.videoLabel}>You</Text>
                  {Platform.OS === 'web' ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={styles.videoElement}
                    />
                  ) : RTCView && localStreamURL ? (
                    <RTCView
                      streamURL={localStreamURL}
                      style={styles.videoElement}
                      objectFit="cover"
                      mirror
                    />
                  ) : (
                    <View style={styles.videoPlaceholder} />
                  )}
                </View>

                {/* Remote video */}
                <View style={styles.videoWrapperRemote}>
                  <Text style={styles.videoLabel}>Doctor</Text>
                  {Platform.OS === 'web' ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={styles.videoElement}
                    />
                  ) : RTCView && remoteStreamURL ? (
                    <RTCView
                      streamURL={remoteStreamURL}
                      style={styles.videoElement}
                      objectFit="cover"
                    />
                  ) : (
                    <View style={styles.videoPlaceholder} />
                  )}
                </View>
              </>
            )}
          </View>

          <Text style={styles.callStatus}>
            {inCall
              ? t("telemedicine_video_active")
              : t("telemedicine_ready_call")}
          </Text>
          <Button
            mode="contained"
            icon={() => <Phone size={18} color="#FFF" />}
            onPress={inCall ? endSession : startSession}
            style={[
              styles.callButton,
              { backgroundColor: inCall ? COLORS.danger : COLORS.telemedicine },
            ]}
          >
            {inCall ? t("telemedicine_end_call") : t("telemedicine_start_call")}
          </Button>
          <Text style={styles.socketStatus}>{socketStatus}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionRow}>
            <User size={22} color={COLORS.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("telemedicine_doctor_handoff")}
            </Text>
          </View>
          <Text style={styles.bodyText}>{t("telemedicine_summary_info")}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionRow}>
            <FileText size={22} color={COLORS.orange} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("telemedicine_ai_summary")}
            </Text>
          </View>
          <Text style={styles.summary}>{summary}</Text>
          {session?.doctor_summary && (
            <Text style={styles.summary}>{session.doctor_summary}</Text>
          )}
          <Button
            mode="outlined"
            onPress={shareSummary}
            style={styles.shareButton}
          >
            {t("telemedicine_send_summary")}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  heroCard: {
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleText: { flex: 1, marginLeft: 14 },
  title: { ...FONTS.bold, color: COLORS.textPrimary },
  subtitle: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
  videoCard: { borderRadius: 14, backgroundColor: "#EFFFFC", marginBottom: 14 },
  videoContent: { alignItems: "center", paddingVertical: 26 },
  roomIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
  roomIdLabel: { ...FONTS.medium, color: COLORS.textSecondary, marginRight: 8 },
  roomIdText: { ...FONTS.bold, color: COLORS.telemedicine, flex: 1 },
  callStatus: { ...FONTS.bold, color: COLORS.textPrimary, marginTop: 12 },
  callButton: { marginTop: 16, borderRadius: 8 },
  socketStatus: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 8 },
  card: { borderRadius: 12, backgroundColor: COLORS.surface, marginBottom: 12 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  bodyText: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 10 },
  summary: {
    ...FONTS.regular,
    color: COLORS.textPrimary,
    marginTop: 12,
    lineHeight: 22,
  },
  shareButton: { marginTop: 14, borderRadius: 8 },
  videoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  videoWrapperLocal: {
    flex: 1,
    minWidth: 150,
    maxWidth: '33%',
  },
  videoWrapperRemote: {
    flex: 2,
    minWidth: 150,
    maxWidth: '66%',
  },
  videoLabel: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  videoElement: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    borderRadius: 8,
  },
});

export default TelemedicineScreen;
