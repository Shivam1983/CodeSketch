// src/components/VoiceChat.tsx
import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceChatState {
  isMuted: boolean;
  isDeafened: boolean;
  isConnected: boolean;
  connectionStatus: string;
  audioLevel: number;
}

export function VoiceChat({
  roomId,
  socket,
}: {
  socket: WebSocket;
  roomId: string;
}) {
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isMuted: true,
    isDeafened: false,
    isConnected: false,
    connectionStatus: 'Disconnected',
    audioLevel: 0
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);

  const startCall = async () => {
    if (!peerConnectionRef.current) {
      await initializeVoiceChat();
    }
    
    try {
      const offer = await peerConnectionRef.current?.createOffer();
      await peerConnectionRef.current?.setLocalDescription(offer);
      
      socket.send(JSON.stringify({
        type: 'offer',
        offer,
        roomId
      }));
      
      setVoiceState(prev => ({
        ...prev,
        connectionStatus: 'Calling...'
      }));
      
      console.log('📞 Outgoing call started', offer);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const initializeVoiceChat = async () => {
    try {
      const configuration = { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ] 
      };
      
      peerConnectionRef.current = new RTCPeerConnection(configuration);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });

      stream.getAudioTracks().forEach(track => {
        track.enabled = !voiceState.isMuted;
      });

      peerConnectionRef.current.onconnectionstatechange = () => {
        const status = peerConnectionRef.current?.connectionState || 'unknown';
        setVoiceState(prev => ({
          ...prev,
          connectionStatus: status
        }));
        console.log('📡 Connection state:', status);
      };

      peerConnectionRef.current.ontrack = (event) => {
        console.log('🎵 Received remote stream');
        remoteStreamRef.current = event.streams[0];
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            roomId
          }));
          console.log('🧊 Sent ICE candidate');
        }
      };

      startAudioLevelMonitoring();
      setVoiceState(prev => ({ ...prev, isConnected: true }));
      
    } catch (error) {
      console.error('Failed to initialize voice chat:', error);
      setVoiceState(prev => ({
        ...prev,
        connectionStatus: 'Failed to initialize'
      }));
    }
  };

  const startAudioLevelMonitoring = () => {
    if (!audioAnalyserRef.current) return;

    const analyser = audioAnalyserRef.current;
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const normalizedLevel = average / 255;
      
      setVoiceState(prev => ({
        ...prev,
        audioLevel: normalizedLevel
      }));

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  };

  const toggleDeafen = () => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !audioElementRef.current.muted;
      setVoiceState(prev => ({ ...prev, isDeafened: !prev.isDeafened }));
    }
  };

  useEffect(() => {
    const audioElement = new Audio();
    audioElement.autoplay = true;
    audioElementRef.current = audioElement;

    const handleWebRTCSignaling = async (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.roomId !== roomId) return;

      console.log('📨 Received WebRTC message:', data.type);

      switch (data.type) {
        case 'offer':
          if (peerConnectionRef.current) {
            console.log('📞 Received call offer');
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.send(JSON.stringify({
              type: 'answer',
              answer,
              roomId
            }));
            console.log('📞 Sent call answer');
          }
          break;

        case 'answer':
          if (peerConnectionRef.current) {
            console.log('📞 Received call answer');
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
          break;

        case 'ice-candidate':
          if (peerConnectionRef.current) {
            console.log('🧊 Received ICE candidate');
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;
      }
    };

    socket.addEventListener('message', handleWebRTCSignaling);
    return () => {
      socket.removeEventListener('message', handleWebRTCSignaling);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null;
      }
    };
  }, [roomId, socket]);

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-gray-800 rounded-xl shadow-lg p-3 space-y-3">
      <div className="flex space-x-2">
        <IconButton
          onClick={toggleMute}
          activated={!voiceState.isMuted}
          icon={voiceState.isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          label={voiceState.isMuted ? "Unmute" : "Mute"}
          className="bg-gray-700 hover:bg-gray-600"
        />
        <IconButton
          onClick={toggleDeafen}
          activated={!voiceState.isDeafened}
          icon={voiceState.isDeafened ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          label={voiceState.isDeafened ? "Undeafen" : "Deafen"}
          className="bg-gray-700 hover:bg-gray-600"
        />
        <button
          onClick={startCall}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Call
        </button>
      </div>
      
      <div className="text-white text-sm space-y-1">
        <div>Status: {voiceState.connectionStatus}</div>
        <div>Audio Level: 
          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden inline-block ml-2">
            <div 
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${voiceState.audioLevel * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}