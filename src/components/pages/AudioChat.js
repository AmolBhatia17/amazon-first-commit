/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiMic, FiMicOff, FiUsers, FiSend, FiSmile, FiHeadphones, FiMessageCircle, FiSquare, FiSkipForward } from 'react-icons/fi';
import SimplePeer from 'simple-peer';
import Header from '../layout/Header';
import { socketService } from '../../utils/socketService';
import { getRtcConfig, ESTABLISHMENT_DELAY_THRESHOLD_MS, STUN_SERVERS } from '../../utils/webrtcStun';
import AudioVisualizer from '../ui/AudioVisualizer';

// Minimal process polyfill for simple-peer in browser builds
if (typeof window !== 'undefined') {
  const proc = window.process || {};
  if (!proc.env) proc.env = {};
  if (typeof proc.nextTick !== 'function') {
    proc.nextTick = (cb, ...args) => Promise.resolve().then(() => cb(...args));
  }
  window.process = proc;
}

const AudioChatContainer = styled.div`
  height: 100vh;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.appBg};
  color: #F8FAFC;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
`;

const MainContent = styled.div`
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  margin-top: 70px;
  position: relative;
  overflow: hidden;
  z-index: 1;
`;

const AudioSection = styled.div`
  display: flex;
  height: 100%;
  gap: 0;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const AudioFeedsContainer = styled.div`
  width: 35%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-right: 1px solid rgba(255,255,255,0.1);
  
  @media (max-width: 768px) {
    width: 100%;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    flex-direction: row;
  }
`;

const AudioFeed = styled.div`
  flex: 1;
  background: #0f0f0f;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 200px;
  overflow: hidden;
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (min-width: 769px) {
    border: 2px solid #1DB954;
    border-radius: 8px;
    margin: 4px;
    
    &:last-child {
      border-bottom: 2px solid #1DB954;
    }
  }
  
  @media (max-width: 768px) {
    min-height: 150px;
    border-bottom: none;
    border-right: 1px solid rgba(255,255,255,0.1);
    
    &:last-child {
      border-right: none;
    }
  }
`;

const HiddenAudioElement = styled.audio`
  display: none;
`;

const AudioPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
  z-index: 1;
  
  svg {
    font-size: 2rem;
    margin-bottom: 10px;
    color: #1DB954;
  }
`;

const AudioLabel = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  z-index: 2;
`;

const RemoteBufferOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.75));
  z-index: 3;
`;

const AudioOverlayButton = styled.button`
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2rem;
  z-index: 2;
  
  &:hover {
    background: rgba(29,185,84,0.2);
    border-color: rgba(29,185,84,0.5);
    transform: translateY(-1px);
  }
  
  &.active {
    background: #1DB954;
    color: #000;
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
    bottom: 8px;
    right: 8px;
  }
`;

const MobileAudioControls = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    position: absolute;
    bottom: 8px;
    left: 8px;
    gap: 8px;
    align-items: center;
    z-index: 2;
  }
`;

const MobileControlButton = styled.button`
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  
  &.start {
    background: linear-gradient(135deg, #1DB954, #19a64c);
    
    &:hover {
      background: linear-gradient(135deg, #20e06b, #1db954);
    }
  }
  
  &.stop {
    background: linear-gradient(135deg, #DC3545, #c82333);
    
    &:hover {
      background: linear-gradient(135deg, #e74c5c, #d63031);
    }
  }
  
  &.skip {
    background: linear-gradient(135deg, #1DB954, #19a64c);
    
    &:hover {
      background: linear-gradient(135deg, #20e06b, #1db954);
    }
  }
`;

const Watermark = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.7);
  padding: 6px 10px;
  border-radius: 6px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(29,185,84,0.3);
  z-index: 2;
  
  @media (max-width: 768px) {
    bottom: 8px;
    right: 8px;
    padding: 4px 8px;
    gap: 4px;
  }
`;

const WatermarkLogo = styled.img`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: contain;
  
  @media (max-width: 768px) {
    width: 14px;
    height: 14px;
  }
`;

const WatermarkText = styled.div`
  color: #1DB954;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const ChatSection = styled.div`
  flex: 1;
  background: #000000;
  display: flex;
  flex-direction: column;
  position: relative;
  
  @media (max-width: 768px) {
    height: 60%;
  }
`;

const ButtonIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  font-size: 1.1em;
`;

const StartChatButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #1DB954 0%, #169c46 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(29, 185, 84, 0.35);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(29, 185, 84, 0.45);
    background: linear-gradient(135deg, #22e06b 0%, #1DB954 100%);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 12px 22px;
    font-size: 0.95rem;
  }
`;

const StopButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(231, 76, 60, 0.35);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.45);
    background: linear-gradient(135deg, #ff6b5b 0%, #e74c3c 100%);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 12px 20px;
    font-size: 0.95rem;
  }
`;

const SkipButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  border-radius: 999px;
  border: 2px solid rgba(29, 185, 84, 0.6);
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: rgba(29, 185, 84, 0.15);
  color: #1DB954;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: rgba(29, 185, 84, 0.25);
    box-shadow: 0 4px 14px rgba(29, 185, 84, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 12px 20px;
    font-size: 0.95rem;
  }
`;

const ChatBox = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  bottom: 100px;
  width: 300px;
  background: rgba(0,0,0,0.9);
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  z-index: 5;
  
  @media (max-width: 768px) {
    position: fixed;
    top: auto;
    bottom: ${props => props.$keyboardHeight ? `${props.$keyboardHeight}px` : '0'};
    left: 0;
    right: 0;
    width: 100%;
    height: 200px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    border-top: 1px solid rgba(29,185,84,0.3);
    transition: bottom 0.3s ease;
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  @media (max-width: 768px) {
    scroll-behavior: smooth;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 2px; }
    &::-webkit-scrollbar-thumb { background: rgba(29,185,84,0.5); border-radius: 2px; }
  }
`;

const Message = styled.div`
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  max-width: 80%;
  word-wrap: break-word;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.own {
    background: rgba(29,185,84,0.2);
    color: #fff;
    align-self: flex-end;
    border: 1px solid rgba(29,185,84,0.4);
  }
  
  &.other {
    background: rgba(255,255,255,0.1);
    color: #fff;
    align-self: flex-start;
    border: 1px solid rgba(255,255,255,0.2);
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
`;

const ReplyPreview = styled.div`
  background: rgba(29,185,84,0.1);
  border-left: 3px solid #1DB954;
  padding: 6px 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #1DB954;
  position: relative;
`;

const ReplyText = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

const ReplyContent = styled.div`
  color: #B3B3B3;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReplyCancel = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: #1DB954;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
  
  &:hover { color: #fff; }
`;

const ReplyIndicator = styled.div`
  background: rgba(29,185,84,0.1);
  border-left: 3px solid #1DB954;
  padding: 4px 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #1DB954;
`;

const ReplyContentSmall = styled.div`
  color: #B3B3B3;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChatInput = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-top: 1px solid rgba(255,255,255,0.1);
  gap: 8px;
  
  @media (max-width: 768px) {
    padding: 12px;
    background: rgba(0,0,0,0.95);
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 6px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 0.9rem;
  
  &:focus { outline: none; border-color: rgba(29,185,84,0.6); }
  &::placeholder { color: #666; }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: 1rem;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(29,185,84,0.5);
  }
`;

const SendButton = styled.button`
  padding: 8px;
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 6px;
  background: rgba(29,185,84,0.1);
  color: #1DB954;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover { background: rgba(29,185,84,0.2); border-color: rgba(29,185,84,0.5); }
  
  @media (max-width: 768px) { padding: 12px; font-size: 1.2rem; }
`;

const EmojiButton = styled.button`
  padding: 8px;
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 6px;
  background: rgba(29,185,84,0.1);
  color: #1DB954;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover { background: rgba(29,185,84,0.2); border-color: rgba(29,185,84,0.5); }
  
  @media (max-width: 768px) { padding: 12px; font-size: 1.2rem; }
`;

const EmojiPicker = styled.div`
  position: absolute;
  bottom: 50px;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 120px;
  background: rgba(0,0,0,0.95);
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  backdrop-filter: blur(10px);
  z-index: 10;
  overflow: hidden;
`;

const EmojiItem = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  
  &:hover { background: rgba(29,185,84,0.2); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const BufferSpinner = styled.div`
  width: 56px;
  height: 56px;
  border: 6px solid rgba(29,185,84,0.3);
  border-top-color: #1DB954;
  border-radius: 50%;
  animation: ${spin} 0.9s linear infinite;
  filter: drop-shadow(0 0 6px rgba(29,185,84,0.5));
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 20px;
  padding: 10px;
  background: rgba(255,68,68,0.1);
  border: 1px solid rgba(255,68,68,0.3);
  border-radius: 6px;
`;

const BottomControlsSection = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: rgba(0,0,0,0.9);
  border-top: 1px solid rgba(29,185,84,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  z-index: 10;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ChatControls = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 10px;
  }
`;

function AudioChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [showRemoteBuffer, setShowRemoteBuffer] = useState(false);
  const hasRemoteStreamRef = useRef(false);
  
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const partnerIdRef = useRef(null);
  const isInitiatorRef = useRef(false);
  const remoteStreamRef = useRef(null);
  const remoteBufferTimerRef = useRef(null);
  const stunServerIndexRef = useRef(0);
  const connectionStartTimeRef = useRef(null);
  const establishmentRecordedRef = useRef(false);

  const recordEstablishmentTime = () => {
    if (establishmentRecordedRef.current) return;
    establishmentRecordedRef.current = true;
    const start = connectionStartTimeRef.current;
    if (start != null) {
      const elapsed = Date.now() - start;
      if (elapsed > ESTABLISHMENT_DELAY_THRESHOLD_MS) {
        stunServerIndexRef.current = (stunServerIndexRef.current + 1) % STUN_SERVERS.length;
        console.log('[STUN] Establishment took', Math.round(elapsed), 'ms > 2.5s, next connection will try server index', stunServerIndexRef.current);
      }
    }
  };

  // New state for visualizer
  const [remoteStreamForVisualizer, setRemoteStreamForVisualizer] = useState(null);

  const cleanupPeer = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.destroy?.();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    setRemoteStreamForVisualizer(null);
    partnerIdRef.current = null;
    hasRemoteStreamRef.current = false;
  };

  const cleanupStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setHasLocalStream(false);
    setShowRemoteBuffer(false);
    if (remoteBufferTimerRef.current) {
      clearTimeout(remoteBufferTimerRef.current);
      remoteBufferTimerRef.current = null;
    }
    hasRemoteStreamRef.current = false;
  };

  const triggerRemoteBuffer = (keepVisible = false) => {
    setShowRemoteBuffer(true);
    if (remoteBufferTimerRef.current) {
      clearTimeout(remoteBufferTimerRef.current);
      remoteBufferTimerRef.current = null;
    }
    
    if (!keepVisible) {
      remoteBufferTimerRef.current = setTimeout(() => {
        setShowRemoteBuffer(false);
        remoteBufferTimerRef.current = null;
      }, 1000);
    }
  };

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      localStreamRef.current = stream;
      setHasLocalStream(true);
      
      setIsWaiting(true);
      setError('');
      return true;
    } catch (err) {
      setError('Microphone blocked. Please enable it and try again.');
      console.error('Error accessing microphone:', err);
      setIsStarted(false);
      return false;
    }
  };

  const setupWebRTC = async (isInitiator) => {
    try {
      if (!localStreamRef.current) {
        setError('Microphone not ready. Please allow access and retry.');
        return;
      }

      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true,
        stream: localStreamRef.current,
        config: getRtcConfig(stunServerIndexRef.current),
      });
      peerConnectionRef.current = peer;
      isInitiatorRef.current = isInitiator;

      peer.on('signal', (sig) => {
        if (!partnerIdRef.current) return;
        const signalType = sig.type || (sig.candidate ? 'ice' : 'offer');
        socketService.send({ type: 'signal', signalType, data: sig });
      });

      peer.on('stream', (remoteStream) => {
        console.log('Peer stream event', remoteStream);
        recordEstablishmentTime();
        remoteStreamRef.current = remoteStream;
        setRemoteStreamForVisualizer(remoteStream);
        applyRemoteStream();
        setIsConnected(true);
        setIsWaiting(false);
        setShowRemoteBuffer(false);
        hasRemoteStreamRef.current = true;
      });

      peer.on('track', (track, stream) => {
        console.log('Peer track event', track, stream);
        recordEstablishmentTime();
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(track);
        setRemoteStreamForVisualizer(remoteStreamRef.current);
        track.onunmute = () => {
          applyRemoteStream();
        };
        applyRemoteStream();
        setIsConnected(true);
        setIsWaiting(false);
        setShowRemoteBuffer(false);
        hasRemoteStreamRef.current = true;
      });

      peer.on('connect', () => {
        recordEstablishmentTime();
        setIsConnected(true);
        setIsWaiting(false);
        setShowRemoteBuffer(false);
      });

      peer.on('close', () => {
        hasRemoteStreamRef.current = false;
        resetForRequeue('Connection closed. Rejoining queue...');
      });

      peer.on('error', (err) => {
        console.error('Peer error', err);
        setError('Connection error');
        resetForRequeue('Connection error. Rejoining queue...');
      });
      peer.on('data', (data) => {
        try {
          const text = new TextDecoder().decode(data);
          const message = {
            id: Date.now(),
            text,
            isOwn: false,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, message]);
        } catch (e) {
          console.error('Data channel decode error', e);
        }
      });
      const pc = peer._pc;
      if (pc) {
        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            resetForRequeue('Connection lost. Rejoining queue...');
          }
        };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            resetForRequeue('Connection lost. Rejoining queue...');
          }
        };
      }
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      setError('Failed to establish connection');
    }
  };

  const handleWebRTCSignal = async (data) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const { signal } = data;
      if (signal) {
        if (data.from && partnerIdRef.current && data.from !== partnerIdRef.current) return;
        if (signal.type === 'offer' && isInitiatorRef.current) return;
        if (signal.type === 'answer' && !isInitiatorRef.current) return;
        
        const state = pc._pc?.signalingState;
        if (signal.type === 'answer') {
          if (state === 'stable' || (state && state !== 'have-local-offer' && state !== 'have-remote-pranswer')) return;
        }
        if (signal.type === 'offer') {
          if (state && state !== 'stable') return;
        }
        pc.signal(signal);
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const applyRemoteStream = () => {
    if (remoteStreamRef.current && remoteAudioRef.current) {
      const audio = remoteAudioRef.current;
      if (audio.srcObject !== remoteStreamRef.current) {
        audio.srcObject = remoteStreamRef.current;
      }
      audio.play?.().catch((err) => {
        if (err?.name !== 'AbortError') {
          console.error('Remote play error', err);
        }
      });
    }
  };

  const resetForRequeue = (message = '') => {
    setIsConnected(false);
    setIsWaiting(true);
    setWaitingMessage(message);
    setMessages([]);
    setReplyingTo(null);
    setAudioEnabled(true);
    setError('');
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
    }
    cleanupPeer();
    triggerRemoteBuffer(true);
    setTimeout(() => {
      socketService.send({ type: 'join', mode: 'audio' });
      console.log('[socket] 🔄 rejoining AUDIO queue');
    }, 100);
  };

  const startNewChat = async () => {
    try {
      setIsConnected(false);
      setIsWaiting(false);
      setWaitingMessage('');
      setError('');
      setIsStarted(false);

      const ok = await startAudio();
      if (!ok) {
        setIsStarted(false);
        return;
      }

      const socket = await socketService.connect().catch(() => null);
      if (!socket) {
        setError('Unable to connect to server. Please try again.');
        setIsStarted(false);
        return;
      }

      setIsStarted(true);
      setIsWaiting(true);
      setWaitingMessage('Looking for a partner...');
      triggerRemoteBuffer(true);
      socketService.send({ type: 'join', mode: 'audio' });
    } catch (err) {
      setError('Failed to start chat. Please try again.');
      console.error('Error starting chat:', err);
      setIsStarted(false);
    }
  };

  const stopChat = () => {
    if (isStarted) {
      socketService.send({ type: 'leave' });
    }
    
    setIsConnected(false);
    setIsWaiting(false);
    setWaitingMessage('');
    setIsStarted(false);
    setError('');
    setMessages([]);
    setReplyingTo(null);
    
    cleanupPeer();
    cleanupStreams();
    socketService.disconnect();
    partnerIdRef.current = null;
  };

  const cancelSearch = () => {
    if (isWaiting && !isConnected) {
      socketService.send({ type: 'cancel' });
      setIsWaiting(false);
      setWaitingMessage('');
      setShowRemoteBuffer(false);
    }
  };

  const skipPartner = async () => {
    if (!isStarted) return;
    
    cleanupPeer();
    setIsConnected(false);
    setIsWaiting(true);
    setWaitingMessage('');
    setMessages([]);
    setReplyingTo(null);
    setError('');
    triggerRemoteBuffer(true);
    setAudioEnabled(true);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
    }
    
    const socket = socketService.getSocket() || await socketService.connect().catch(() => null);
    if (socket) {
      socketService.send({ type: 'skip' });
      setTimeout(() => {
        socketService.send({ type: 'join', mode: 'audio' });
        console.log('[socket] ⏭️ skipped + rejoining AUDIO queue');
      }, 100);
    } else {
      setError('Unable to reconnect. Please restart.');
      setIsStarted(false);
      setIsWaiting(false);
      setShowRemoteBuffer(false);
    }
  };

  const scrollToBottom = () => {
    if (window.innerWidth <= 768 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    try {
      if (peerConnectionRef.current) {
        const encoder = new TextEncoder();
        peerConnectionRef.current.send(encoder.encode(trimmed));
      }
    } catch (err) {
      console.error('Data channel send failed', err);
    }

    const message = {
      id: Date.now(),
      text: trimmed,
      isOwn: true,
      timestamp: new Date(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        isOwn: replyingTo.isOwn
      } : null
    };
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyingTo(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const toggleEmojiPicker = () => setShowEmojiPicker(!showEmojiPicker);
  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        const initialHeight = window.innerHeight;
        const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const keyboardHeight = initialHeight - currentHeight;
        setKeyboardHeight(keyboardHeight > 0 ? keyboardHeight : 0);
      }
    };
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(keyboardHeight > 0 ? keyboardHeight : 0);
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    } else {
      window.addEventListener('resize', handleResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const replyToMessage = (message) => {
    setReplyingTo(message);
    setShowEmojiPicker(false);
  };
  const cancelReply = () => setReplyingTo(null);

  // Ensure remote audio attaches when stream arrives or element mounts
  useEffect(() => {
    applyRemoteStream();
    const audioElement = remoteAudioRef.current;
    if (audioElement) {
      const handler = () => applyRemoteStream();
      audioElement.addEventListener('loadedmetadata', handler);
      return () => audioElement.removeEventListener('loadedmetadata', handler);
    }
  }, [isConnected]);

  // Waiting message timeout
  useEffect(() => {
    let timer;
    if (isWaiting && !isConnected) {
      timer = setTimeout(() => {
        setWaitingMessage('Still looking for a partner...');
      }, 8000);
    } else {
      setWaitingMessage('');
    }
    return () => timer && clearTimeout(timer);
  }, [isWaiting, isConnected]);

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      if (isStarted) {
        socketService.send({ type: 'leave' });
      }
      cleanupPeer();
      cleanupStreams();
      socketService.disconnect();
    };
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!isStarted) return;

    const handleMatch = async (data) => {
      setMessages([]);
      setReplyingTo(null);
      partnerIdRef.current = data.partnerId;
      setWaitingMessage('Found partner! Connecting...');
      triggerRemoteBuffer(false);
      connectionStartTimeRef.current = Date.now();
      establishmentRecordedRef.current = false;

      console.log('[ws] 🎯 matched with', data.partnerId);

      if (!localStreamRef.current) {
        setError('Microphone not ready.');
        return;
      }

      socketService.send({ type: 'acknowledge' });
      await setupWebRTC(data.initiator);
    };

    const handleSessionReady = () => setWaitingMessage('Connected!');
    const handleSearchCancelled = () => {
      setIsWaiting(false);
      setWaitingMessage('');
      setShowRemoteBuffer(false);
    };

    const handleSignal = (data) => {
      triggerRemoteBuffer();
      handleWebRTCSignal({ signal: data.data });
    };

    const handlePartnerLeft = () => resetForRequeue('Partner disconnected. Rejoining queue...');
    const handlePartnerSkipped = () => resetForRequeue('Partner skipped. Rejoining queue...');

    const handleQueue = (data) => {
      setIsWaiting(true);
      setIsConnected(false);
      const position = data.position || 1;
      setWaitingMessage(position === 1 ? 'Looking for a partner...' : `In queue (position ${position})`);
      triggerRemoteBuffer(true);
    };

    const handleError = (error) => {
      const msg = error.message || error?.data || '';
      if (!msg.toLowerCase().includes('already in session') && !msg.toLowerCase().includes('already searching')) {
        console.error('WS error:', error);
      }
    };

    socketService.on('matched', handleMatch);
    socketService.on('signal', handleSignal);
    socketService.on('partner-left', handlePartnerLeft);
    socketService.on('partner-skipped', handlePartnerSkipped);
    socketService.on('queue', handleQueue);
    socketService.on('session-ready', handleSessionReady);
    socketService.on('search-cancelled', handleSearchCancelled);
    socketService.on('error', handleError);

    return () => {
      socketService.off('matched', handleMatch);
      socketService.off('signal', handleSignal);
      socketService.off('partner-left', handlePartnerLeft);
      socketService.off('partner-skipped', handlePartnerSkipped);
      socketService.off('queue', handleQueue);
      socketService.off('session-ready', handleSessionReady);
      socketService.off('search-cancelled', handleSearchCancelled);
      socketService.off('error', handleError);
    };
  }, [isStarted]);

  return (
    <AudioChatContainer>
      <Header logo="Unitalks" hasSidebar={false} />
      
      <MainContent>
        <AudioSection>
          <AudioFeedsContainer>
            {/* Hidden Audio Element for playing remote sound */}
            <HiddenAudioElement ref={remoteAudioRef} autoPlay />

            {/* Remote Audio Visualizer */}
            <AudioFeed>
              {isConnected && remoteStreamForVisualizer ? (
                <AudioVisualizer stream={remoteStreamForVisualizer} isLocal={false} />
              ) : (
                <AudioPlaceholder style={{ position: 'absolute', inset: 0 }}>
                  <FiUsers />
                  <div>Stranger</div>
                </AudioPlaceholder>
              )}
              {showRemoteBuffer && (
                <RemoteBufferOverlay>
                  <BufferSpinner />
                </RemoteBufferOverlay>
              )}
              <AudioLabel>Stranger</AudioLabel>
              <Watermark>
                <WatermarkLogo src="/assets/logos/logo.png" alt="UniTalks Logo" />
                <WatermarkText>UniTalks</WatermarkText>
              </Watermark>
            </AudioFeed>
            
            {/* Local Audio Visualizer */}
            <AudioFeed>
              {hasLocalStream && localStreamRef.current ? (
                <AudioVisualizer stream={localStreamRef.current} isLocal={true} />
              ) : (
                <AudioPlaceholder>
                  <FiMic />
                  <div>Your Mic</div>
                </AudioPlaceholder>
              )}
              <AudioOverlayButton
                onClick={toggleAudio}
                className={audioEnabled ? 'active' : ''}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? <FiMic /> : <FiMicOff />}
              </AudioOverlayButton>
              <MobileAudioControls>
                <MobileControlButton
                  onClick={skipPartner}
                  className="skip"
                  title="Skip to next stranger"
                  disabled={!isStarted}
                  style={{ opacity: isStarted ? 1 : 0.5, cursor: isStarted ? 'pointer' : 'not-allowed' }}
                >
                  SKIP
                </MobileControlButton>
                <MobileControlButton
                  onClick={isStarted ? stopChat : startNewChat}
                  className={isStarted ? 'stop' : 'start'}
                  title={isStarted ? "Stop chat" : "Start new chat"}
                >
                  {isStarted ? 'STOP' : 'START'}
                </MobileControlButton>
              </MobileAudioControls>
            </AudioFeed>
          </AudioFeedsContainer>
          
          <ChatSection>
            {error && !error.includes('already in session') && !error.includes('Already searching') && <ErrorMessage>{error}</ErrorMessage>}
             
            <ChatBox $keyboardHeight={keyboardHeight}>
              <ChatMessages>
                {messages.map((message) => (
                  <Message 
                    key={message.id} 
                    className={message.isOwn ? 'own' : 'other'}
                    onClick={() => replyToMessage(message)}
                  >
                    {message.replyTo && (
                      <ReplyIndicator>
                        <ReplyText>
                          Replying to {message.replyTo.isOwn ? 'yourself' : 'stranger'}
                        </ReplyText>
                        <ReplyContentSmall>
                          {message.replyTo.text}
                        </ReplyContentSmall>
                      </ReplyIndicator>
                    )}
                    {message.text}
                  </Message>
                ))}
                <div ref={messagesEndRef} />
              </ChatMessages>
              <ChatInput>
                {replyingTo && (
                  <ReplyPreview>
                    <ReplyText>
                      Replying to {replyingTo.isOwn ? 'yourself' : 'stranger'}
                    </ReplyText>
                    <ReplyContent>
                      {replyingTo.text}
                    </ReplyContent>
                    <ReplyCancel onClick={cancelReply}>
                      ✕
                    </ReplyCancel>
                  </ReplyPreview>
                )}
                <InputRow>
                  <MessageInput
                    type="text"
                    placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <EmojiButton onClick={toggleEmojiPicker}>
                    <FiSmile />
                  </EmojiButton>
                  <SendButton onClick={sendMessage}>
                    <FiSend />
                  </SendButton>
                </InputRow>
                {showEmojiPicker && (
                  <EmojiPicker>
                    {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '💯', '👏', '🙌', '😊', '😘', '🤗', '😴', '🤤', '😋', '🥳', '😇', '😮', '😯', '😲', '😳', '😵', '😶', '😷', '🤒'].map((emoji) => (
                      <EmojiItem key={emoji} onClick={() => addEmoji(emoji)}>
                        {emoji}
                      </EmojiItem>
                    ))}
                  </EmojiPicker>
                )}
              </ChatInput>
            </ChatBox>
             
            <BottomControlsSection>
              <ChatControls>
                {!isStarted ? (
                  <StartChatButton onClick={startNewChat} title="Start chat">
                    <ButtonIcon><FiMessageCircle /></ButtonIcon>
                    Start Chat
                  </StartChatButton>
                ) : (
                  <>
                    <StopButton
                      onClick={isWaiting && !isConnected ? cancelSearch : stopChat}
                      title={isWaiting && !isConnected ? "Cancel search" : "Stop chat"}
                    >
                      <ButtonIcon><FiSquare /></ButtonIcon>
                      Stop
                    </StopButton>
                    <SkipButton
                      onClick={skipPartner}
                      title="Skip to next stranger"
                      disabled={!isStarted}
                    >
                      <ButtonIcon><FiSkipForward /></ButtonIcon>
                      Skip
                    </SkipButton>
                  </>
                )}
              </ChatControls>
            </BottomControlsSection>
          </ChatSection>
        </AudioSection>
      </MainContent>
    </AudioChatContainer>
  );
}

export default AudioChat;
