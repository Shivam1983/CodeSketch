// src/components/VoiceChat.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { IconButton } from "./IconButton";
import { Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff, PhoneIncoming } from "lucide-react";

type CallStatus = "idle" | "calling" | "incoming" | "connected";

interface VoiceChatState {
  isMuted: boolean;
  isDeafened: boolean;
  callStatus: CallStatus;
  connectionStatus: string;
  audioLevel: number;
}

export function VoiceChat({
  roomId,
  socket,
  isChatOpen,
}: {
  socket: WebSocket;
  roomId: string;
  isChatOpen?: boolean;
}) {
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isMuted: false,
    isDeafened: false,
    callStatus: "idle",
    connectionStatus: "Disconnected",
    audioLevel: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const isMakingOfferRef = useRef<boolean>(false);

  const startAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }

      if (!audioContextRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }

      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioAnalyserRef.current = analyser;

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        const normalizedLevel = average / 255;

        setVoiceState((prev) => ({
          ...prev,
          audioLevel: normalizedLevel,
        }));

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (error) {
      console.warn("Audio level monitoring not available:", error);
    }
  };

  const processPendingIceCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("🧊 Added queued ICE candidate");
        } catch (e) {
          console.error("Error adding queued ICE candidate:", e);
        }
      }
    }
  };

  const initializeVoiceChat = useCallback(async (): Promise<RTCPeerConnection | null> => {
    try {
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== "closed") {
        return peerConnectionRef.current;
      }

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        startAudioLevelMonitoring(stream);
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream!);
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = !voiceState.isMuted;
      });

      pc.onconnectionstatechange = () => {
        const status = pc.connectionState || "unknown";
        console.log("📡 WebRTC Connection state:", status);
        if (status === "connected") {
          setVoiceState((prev) => ({
            ...prev,
            callStatus: "connected",
            connectionStatus: "Connected",
          }));
        } else if (status === "disconnected" || status === "failed" || status === "closed") {
          cleanupConnection();
          setVoiceState((prev) => ({
            ...prev,
            callStatus: "idle",
            connectionStatus: "Disconnected",
          }));
        }
      };

      pc.ontrack = (event) => {
        console.log("🎵 Received remote audio stream");
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = event.streams[0];
            audioElementRef.current.play().catch((e) => {
              console.log("Audio play error / user interaction required:", e);
            });
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "ice-candidate",
              candidate: event.candidate,
              roomId,
            })
          );
          console.log("🧊 Sent ICE candidate");
        }
      };

      return pc;
    } catch (error) {
      console.error("Failed to initialize voice chat:", error);
      setVoiceState((prev) => ({
        ...prev,
        callStatus: "idle",
        connectionStatus: "Mic Access Denied",
      }));
      return null;
    }
  }, [roomId, socket, voiceState.isMuted]);

  const cleanupConnection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    isMakingOfferRef.current = false;
  };

  // Start Call (Caller initiates)
  const startCall = async () => {
    try {
      if (isMakingOfferRef.current) return;
      isMakingOfferRef.current = true;

      setVoiceState((prev) => ({
        ...prev,
        callStatus: "calling",
        connectionStatus: "Calling...",
      }));

      let pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === "closed") {
        pc = await initializeVoiceChat();
      }
      if (!pc) {
        isMakingOfferRef.current = false;
        setVoiceState((prev) => ({
          ...prev,
          callStatus: "idle",
          connectionStatus: "Mic Access Required",
        }));
        return;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.send(
        JSON.stringify({
          type: "offer",
          offer,
          roomId,
        })
      );

      console.log("📞 Outgoing call offer sent");
    } catch (error) {
      console.error("Failed to start call:", error);
      cleanupConnection();
      setVoiceState((prev) => ({
        ...prev,
        callStatus: "idle",
        connectionStatus: "Call Failed",
      }));
    } finally {
      isMakingOfferRef.current = false;
    }
  };

  // Accept Call (Receiver clicks Accept)
  const acceptCall = async () => {
    if (!incomingOfferRef.current) {
      console.warn("No incoming offer found to accept");
      return;
    }

    try {
      setVoiceState((prev) => ({
        ...prev,
        callStatus: "connected",
        connectionStatus: "Connecting...",
      }));

      const offer = incomingOfferRef.current;
      incomingOfferRef.current = null;

      let pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === "closed") {
        pc = await initializeVoiceChat();
      }
      if (!pc) {
        setVoiceState((prev) => ({
          ...prev,
          callStatus: "idle",
          connectionStatus: "Mic Access Denied",
        }));
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await processPendingIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.send(
        JSON.stringify({
          type: "answer",
          answer,
          roomId,
        })
      );

      console.log("📞 Call accepted & answer sent");
    } catch (error) {
      console.error("Failed to accept call:", error);
      cleanupConnection();
      setVoiceState((prev) => ({
        ...prev,
        callStatus: "idle",
        connectionStatus: "Accept Failed",
      }));
    }
  };

  // Decline Call (Receiver clicks Decline)
  const declineCall = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "reject_call",
          roomId,
        })
      );
    }
    cleanupConnection();
    setVoiceState((prev) => ({
      ...prev,
      callStatus: "idle",
      connectionStatus: "Call Declined",
      audioLevel: 0,
    }));
    console.log("📞 Incoming call declined");
  };

  // End Call / Cancel Outgoing Call
  const endCall = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "hang_up",
          roomId,
        })
      );
    }
    cleanupConnection();
    setVoiceState((prev) => ({
      ...prev,
      callStatus: "idle",
      connectionStatus: "Disconnected",
      audioLevel: 0,
    }));
    console.log("📞 Call ended");
  };

  const toggleMute = () => {
    const nextMuted = !voiceState.isMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    setVoiceState((prev) => ({ ...prev, isMuted: nextMuted }));
  };

  const toggleDeafen = () => {
    const nextDeafened = !voiceState.isDeafened;
    if (audioElementRef.current) {
      audioElementRef.current.muted = nextDeafened;
    }
    setVoiceState((prev) => ({ ...prev, isDeafened: nextDeafened }));
  };

  useEffect(() => {
    const audioElement = new Audio();
    audioElement.autoplay = true;
    audioElementRef.current = audioElement;

    const handleWebRTCSignaling = async (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : JSON.parse(event.data.toString());

        if (data.roomId !== roomId) return;
        if (!["offer", "answer", "ice-candidate", "reject_call", "hang_up"].includes(data.type)) return;

        console.log("📨 Received WebRTC message:", data.type);

        switch (data.type) {
          case "offer": {
            console.log("📞 Received incoming call offer");
            // Store offer and notify user to Accept or Decline
            incomingOfferRef.current = data.offer;
            setVoiceState((prev) => ({
              ...prev,
              callStatus: "incoming",
              connectionStatus: "Incoming Call...",
            }));
            break;
          }

          case "answer": {
            console.log("📞 Received call answer from peer");
            const pc = peerConnectionRef.current;
            if (!pc) {
              console.warn("Received answer but no RTCPeerConnection exists");
              return;
            }

            if (pc.signalingState !== "have-local-offer") {
              console.warn(
                `Ignoring remote answer SDP: Called in state '${pc.signalingState}' (expected 'have-local-offer')`
              );
              return;
            }

            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await processPendingIceCandidates(pc);

            setVoiceState((prev) => ({
              ...prev,
              callStatus: "connected",
              connectionStatus: "Connected",
            }));
            break;
          }

          case "ice-candidate": {
            if (!data.candidate) return;
            const pc = peerConnectionRef.current;

            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log("🧊 Received & added ICE candidate");
              } catch (e) {
                console.error("Failed to add ICE candidate:", e);
              }
            } else {
              console.log("🧊 Queued ICE candidate (waiting for remoteDescription)");
              pendingCandidatesRef.current.push(data.candidate);
            }
            break;
          }

          case "reject_call": {
            console.log("📞 Call was rejected/declined by peer");
            cleanupConnection();
            setVoiceState((prev) => ({
              ...prev,
              callStatus: "idle",
              connectionStatus: "Call Declined",
              audioLevel: 0,
            }));
            break;
          }

          case "hang_up": {
            console.log("📞 Peer ended the call");
            cleanupConnection();
            setVoiceState((prev) => ({
              ...prev,
              callStatus: "idle",
              connectionStatus: "Call Ended",
              audioLevel: 0,
            }));
            break;
          }
        }
      } catch (error) {
        console.error("Error handling WebRTC signaling:", error);
      }
    };

    socket.addEventListener("message", handleWebRTCSignaling);

    return () => {
      socket.removeEventListener("message", handleWebRTCSignaling);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      cleanupConnection();
    };
  }, [roomId, socket]);

  return (
    <div
      className={`fixed bottom-4 z-30 bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-3 space-y-3 transition-all duration-300 ${
        isChatOpen ? "right-[calc(25%+1rem)]" : "right-4"
      }`}
    >
      <div className="flex items-center space-x-2">
        <IconButton
          onClick={toggleMute}
          activated={!voiceState.isMuted}
          icon={
            voiceState.isMuted ? (
              <MicOff className="w-5 h-5 text-red-400" />
            ) : (
              <Mic className="w-5 h-5 text-emerald-400" />
            )
          }
          label={voiceState.isMuted ? "Unmute" : "Mute"}
          className="bg-gray-700 hover:bg-gray-600"
        />
        <IconButton
          onClick={toggleDeafen}
          activated={!voiceState.isDeafened}
          icon={
            voiceState.isDeafened ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )
          }
          label={voiceState.isDeafened ? "Undeafen" : "Deafen"}
          className="bg-gray-700 hover:bg-gray-600"
        />

        {/* 1. Idle State: Start Call Button */}
        {voiceState.callStatus === "idle" && (
          <button
            onClick={startCall}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            Start Call
          </button>
        )}

        {/* 2. Outgoing Calling State: Cancel Button */}
        {voiceState.callStatus === "calling" && (
          <button
            onClick={endCall}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95 animate-pulse"
          >
            <PhoneOff className="w-4 h-4" />
            Cancel
          </button>
        )}

        {/* 3. Incoming Call State: Accept (Green) & Decline (Red) Buttons */}
        {voiceState.callStatus === "incoming" && (
          <div className="flex items-center space-x-1.5 animate-bounce">
            <button
              onClick={acceptCall}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-800 transition-all active:scale-95"
            >
              <PhoneIncoming className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={declineCall}
              className="flex items-center gap-1 px-2.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Decline
            </button>
          </div>
        )}

        {/* 4. Connected State: End Call Button */}
        {voiceState.callStatus === "connected" && (
          <button
            onClick={endCall}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
        )}
      </div>

      <div className="text-white text-xs space-y-1.5 pt-1 border-t border-gray-700/60">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status:</span>
          <span
            className={`font-medium ${
              voiceState.callStatus === "connected"
                ? "text-emerald-400 font-semibold"
                : voiceState.callStatus === "incoming"
                ? "text-emerald-300 font-semibold animate-pulse"
                : voiceState.callStatus === "calling"
                ? "text-amber-400 animate-pulse"
                : "text-gray-300"
            }`}
          >
            {voiceState.connectionStatus}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Audio:</span>
          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden inline-block ml-2">
            <div
              className={`h-full transition-all duration-100 ${
                voiceState.isMuted ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{
                width: `${
                  voiceState.isMuted || voiceState.callStatus !== "connected"
                    ? 0
                    : Math.min(voiceState.audioLevel * 100 * 3, 100)
                }%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}