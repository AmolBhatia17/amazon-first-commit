import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiVideo, FiMic, FiMicOff, FiSkipForward, FiUsers, FiSend, FiSmile } from 'react-icons/fi';
import SimplePeer from 'simple-peer';
import Header from '../layout/Header';
import { socketService } from '../../utils/socketService';

// Minimal process polyfill for simple-peer in browser builds
if (typeof window !== 'undefined') {
  const proc = window.process || {};
  if (!proc.env) proc.env = {};
  if (typeof proc.nextTick !== 'function') {
    proc.nextTick = (cb, ...args) => Promise.resolve().then(() => cb(...args));
  }
  window.process = proc;
}

const VideoChatContainer = styled.div`
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

const VideoSection = styled.div`
  display: flex;
  height: 100%;
  gap: 0;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const VideoFeedsContainer = styled.div`
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

const VideoFeed = styled.div`
  flex: 1;
  background: #0f0f0f;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 200px;
  
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

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
`;

const VideoPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
  
  svg {
    font-size: 2rem;
    margin-bottom: 10px;
    color: #1DB954;
  }
`;

const VideoLabel = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const RemoteBufferOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.75));
  z-index: 2;
`;

const VideoOverlayButton = styled.button`
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

const MobileVideoControls = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    position: absolute;
    bottom: 8px;
    left: 8px;
    gap: 8px;
    align-items: center;
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

const ChatHeader = styled.div`
  padding: 20px;
  border-bottom: none;
  background: transparent;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  
  img {
    height: 40px;
    width: 40px;
    border-radius: 8px;
  }
`;

const BrandText = styled.span`
  color: #ffffff;
  font-family: 'Press Start 2P', cursive, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0.5px;
`;


const StatusMessage = styled.div`
  color: #F8FAFC;
  font-size: 1.1rem;
  margin-bottom: 20px;
  text-align: center;
`;

const NewChatButton = styled.button`
  background: linear-gradient(135deg, #1DB954, #19a64c);
  color: #0b0b0f;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 15px;
  width: 100%;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(29,185,84,0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const InterestSection = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const InterestText = styled.div`
  color: #B3B3B3;
  font-size: 0.9rem;
  margin-bottom: 10px;
`;

const LanguageLink = styled.button`
  background: none;
  border: none;
  color: #1DB954;
  text-decoration: none;
  font-size: 0.9rem;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
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

const ControlButton = styled.button`
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
  
  &:hover {
    background: rgba(29,185,84,0.2);
    border-color: rgba(29,185,84,0.5);
    transform: translateY(-1px);
  }
  
  &.active {
    background: #1DB954;
    color: #000;
  }
  
  &.danger {
    background: #ff4444;
    color: #fff;
    
    &:hover {
      background: #ff6666;
    }
  }
`;

const SkipButton = styled.button`
  background: linear-gradient(135deg, #1DB954, #19a64c);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(29,185,84,0.3);
    background: linear-gradient(135deg, #20e06b, #1db954);
  }
  
  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 0.8rem;
    min-width: auto;
  }
`;

const StartStopButton = styled.button`
  background: ${props => props.$isStarted 
    ? 'linear-gradient(135deg, #DC3545, #c82333)' 
    : 'linear-gradient(135deg, #1DB954, #19a64c)'};
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.$isStarted 
      ? '0 2px 8px rgba(220,53,69,0.3)' 
      : '0 2px 8px rgba(29,185,84,0.3)'};
    background: ${props => props.$isStarted 
      ? 'linear-gradient(135deg, #e74c5c, #d63031)' 
      : 'linear-gradient(135deg, #20e06b, #1db954)'};
  }
  
  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 0.8rem;
    min-width: auto;
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
    /* Auto-scroll to bottom on mobile */
    scroll-behavior: smooth;
    
    /* Hide scrollbar but keep functionality */
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(29,185,84,0.5);
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: rgba(29,185,84,0.7);
    }
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
  
  &:hover {
    color: #fff;
  }
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
  
  &:focus {
    outline: none;
    border-color: rgba(29,185,84,0.6);
  }
  
  &::placeholder {
    color: #666;
  }
  
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
  
  &:hover {
    background: rgba(29,185,84,0.2);
    border-color: rgba(29,185,84,0.5);
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    font-size: 1.2rem;
  }
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
  
  &:hover {
    background: rgba(29,185,84,0.2);
    border-color: rgba(29,185,84,0.5);
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    font-size: 1.2rem;
  }
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
  
  &:hover {
    background: rgba(29,185,84,0.2);
  }
`;


const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const WaitingIndicator = styled.div`
  color: #1DB954;
  font-size: 0.9rem;
  text-align: center;
  animation: ${pulse} 2s ease-in-out infinite;
  margin-bottom: 20px;
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

function VideoChat() {
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
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const partnerIdRef = useRef(null);
  const isInitiatorRef = useRef(false);
  const remoteStreamRef = useRef(null);
  const remoteBufferTimerRef = useRef(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const cleanupPeer = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.destroy?.();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    partnerIdRef.current = null;
    hasRemoteStreamRef.current = false;
  };

  const cleanupStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
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
    
    // If keepVisible is true (for queue waiting), don't auto-hide
    if (!keepVisible) {
      remoteBufferTimerRef.current = setTimeout(() => {
        setShowRemoteBuffer(false);
        remoteBufferTimerRef.current = null;
      }, 1000);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      setHasLocalStream(true);

      // Set local video immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(err => {
          console.error('Error playing local video:', err);
        });
      }
      
      setIsWaiting(true);
      setError('');
      return true;
    } catch (err) {
      setError('Camera blocked. Please enable it and try again.');
      console.error('Error accessing camera:', err);
      setIsStarted(false);
      return false;
    }
  };

  const setupWebRTC = async (isInitiator) => {
    try {
      if (!localStreamRef.current) {
        setError('Camera/stream not ready. Please allow camera access and retry.');
        return;
      }

      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false, // send complete SDP to reduce mid-call ICE issues
        stream: localStreamRef.current,
        config: rtcConfig,
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
        remoteStreamRef.current = remoteStream;
        applyRemoteStream();
        setIsConnected(true);
        setIsWaiting(false);
        setShowRemoteBuffer(false);
        hasRemoteStreamRef.current = true;
      });

      // Fallback for browsers emitting 'track'
      peer.on('track', (track, stream) => {
        console.log('Peer track event', track, stream);
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(track);
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
          console.log('ICE state', state);
          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            resetForRequeue('Connection lost. Rejoining queue...');
          }
        };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          console.log('Peer connection state', state);
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
    if (!pc) {
      console.warn('Dropping signal - no peer connection');
      return;
    }

    try {
      const { signal } = data;
      if (signal) {
        // Ignore signals from previous partner
        if (data.from && partnerIdRef.current && data.from !== partnerIdRef.current) {
          console.warn('Dropping signal from old partner', data.from);
          return;
        }
        // Role-based guards to avoid wrong-state errors
        if (signal.type === 'offer' && isInitiatorRef.current) {
          console.warn('Initiator dropping unexpected offer');
          return;
        }
        if (signal.type === 'answer' && !isInitiatorRef.current) {
          console.warn('Receiver dropping unexpected answer');
          return;
        }
        // Signaling-state guards to avoid stable-state errors
        const state = pc._pc?.signalingState;
        if (signal.type === 'answer') {
          if (state === 'stable') {
            console.warn('Dropping late answer in stable state');
            return;
          }
          if (state && state !== 'have-local-offer' && state !== 'have-remote-pranswer') {
            console.warn('Dropping answer in state', state);
            return;
          }
        }
        if (signal.type === 'offer') {
          // Only accept offers when we are idle/stable (non-initiator)
          if (state && state !== 'stable') {
            console.warn('Dropping offer in non-stable state', state);
            return;
          }
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
    if (remoteStreamRef.current && remoteVideoRef.current) {
      const video = remoteVideoRef.current;
      if (video.srcObject !== remoteStreamRef.current) {
        video.srcObject = remoteStreamRef.current;
      }
      video.muted = true;
      video.volume = 1;
      video.play?.().catch((err) => {
        if (err?.name !== 'AbortError') {
          console.error('Remote play error', err);
        }
      });
      setTimeout(() => {
        if (remoteVideoRef.current) remoteVideoRef.current.muted = false;
      }, 200);
    }
  };

  const resetForRequeue = (message = '') => {
    setIsConnected(false);
    setIsWaiting(true);
    setWaitingMessage(message);
    setMessages([]);
    setReplyingTo(null);
    setAudioEnabled(true);
    setError(''); // Clear any connection errors
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
    }
    cleanupPeer();
    triggerRemoteBuffer(true); // Keep visible while waiting in queue
    // Small delay to ensure cleanup is complete before rejoining at END of queue (FIFO)
    setTimeout(() => {
      socketService.send({ type: 'join' });
      console.log('[socket] 🔄 rejoining queue at END (FIFO) - no reconnection restrictions');
    }, 100);
  };

  const startNewChat = async () => {
    try {
      setIsConnected(false);
      setIsWaiting(false);
      setWaitingMessage('');
      setError('');
      setIsStarted(false);

      // Start video stream; if fails, abort
      const ok = await startVideo();
      if (!ok) {
        setIsStarted(false);
        return;
      }

      // Connect WS and join queue
      const socket = await socketService.connect().catch(() => null);
      if (!socket) {
        setError('Unable to connect to server. Please try again.');
        setIsStarted(false);
        return;
      }

      setIsStarted(true);
      setIsWaiting(true);
      setWaitingMessage('Looking for a partner...');
      triggerRemoteBuffer(true); // Keep visible until matched
      socketService.send({ type: 'join' });
    } catch (err) {
      setError('Failed to start chat. Please try again.');
      console.error('Error starting chat:', err);
      setIsStarted(false);
    }
  };

  const stopChat = () => {
    // Send leave message before cleanup
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
      console.log('[ws] cancelled search');
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
    setError(''); // Clear errors immediately
    triggerRemoteBuffer(true); // Keep visible while waiting in queue
    // reset audio state to default enabled
    setAudioEnabled(true);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
    }
    
    // Notify server with delay to ensure cleanup
    const socket = socketService.getSocket() || await socketService.connect().catch(() => null);
    if (socket) {
      socketService.send({ type: 'skip' });
      // Small delay before rejoining to avoid race conditions
      setTimeout(() => {
        socketService.send({ type: 'join' });
        console.log('[socket] ⏭️ skipped + rejoining at END of queue (FIFO), reconnections allowed');
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
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle keyboard popup on mobile
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

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Ensure local video displays when stream is available
  useEffect(() => {
    const updateLocalVideo = () => {
      if (localStreamRef.current && localVideoRef.current) {
        const video = localVideoRef.current;
        if (video.srcObject !== localStreamRef.current) {
          video.srcObject = localStreamRef.current;
          video.play().catch(err => {
            console.error('Error playing local video:', err);
          });
        }
      }
    };

    // Update immediately
    updateLocalVideo();

    // Also update when video element becomes available
    const videoElement = localVideoRef.current;
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', updateLocalVideo);
      return () => {
        videoElement.removeEventListener('loadedmetadata', updateLocalVideo);
      };
    }
  }, [isStarted, hasLocalStream]);

  // Ensure remote video attaches when stream arrives or element mounts
  useEffect(() => {
    applyRemoteStream();
    const videoElement = remoteVideoRef.current;
    if (videoElement) {
      const handler = () => applyRemoteStream();
      videoElement.addEventListener('loadedmetadata', handler);
      return () => videoElement.removeEventListener('loadedmetadata', handler);
    }
  }, [isConnected]);

  // Waiting message timeout to avoid infinite spinner UX
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

  // Setup socket event listeners
  useEffect(() => {
    if (!isStarted) return;

    const handleMatch = async (data) => {
      setMessages([]);
      setReplyingTo(null);
      partnerIdRef.current = data.partnerId;
      setWaitingMessage('Found partner! Connecting...');
      // Use timed buffer for connection phase
      triggerRemoteBuffer(false);
      
      console.log('[ws] 🎯 matched with', data.partnerId, '- reconnections allowed, FIFO matching');
      
      if (!localStreamRef.current) {
        setError('Camera not ready. Please allow camera access.');
        return;
      }

      // Acknowledge the match to follow Omegle rules
      socketService.send({ type: 'acknowledge' });
      console.log('[ws] acknowledged match with', data.partnerId);
      
      await setupWebRTC(data.initiator);
    };

    const handleSessionReady = () => {
      console.log('[ws] session is now fully active');
      setWaitingMessage('Connected!');
      // Session is now ready for full communication
    };

    const handleSearchCancelled = () => {
      setIsWaiting(false);
      setWaitingMessage('');
      setShowRemoteBuffer(false);
      console.log('[ws] search was cancelled');
    };

    const handleSignal = (data) => {
      triggerRemoteBuffer();
      handleWebRTCSignal({ signal: data.data });
    };

    const handlePartnerLeft = () => {
      resetForRequeue('Partner disconnected. Rejoining queue...');
    };

    const handlePartnerSkipped = () => {
      resetForRequeue('Partner skipped. Rejoining queue...');
    };

    const handleQueue = (data) => {
      setIsWaiting(true);
      setIsConnected(false);
      const position = data.position || 1;
      if (position === 1) {
        setWaitingMessage('Looking for a partner...');
      } else {
        setWaitingMessage(`In queue (position ${position}) - FIFO order`);
      }
      // Keep buffer visible while in queue
      triggerRemoteBuffer(true);
      console.log('[ws] queue position', position, '- following FIFO, no reconnection restrictions');
    };

    const handleError = (error) => {
      // Suppress all visible UI errors as requested, especially "Already in session"
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
    <VideoChatContainer>
      <Header 
        logo="Unitalks"
        hasSidebar={false}
      />
      
      <MainContent>
        <VideoSection>
          <VideoFeedsContainer>
            <VideoFeed>
              <VideoElement
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ visibility: isConnected ? 'visible' : 'hidden' }}
              />
              {!isConnected && (
                <VideoPlaceholder style={{ position: 'absolute', inset: 0 }}>
                  <FiUsers />
                  <div>Stranger</div>
                </VideoPlaceholder>
              )}
              {showRemoteBuffer && (
                <RemoteBufferOverlay>
                  <BufferSpinner />
                </RemoteBufferOverlay>
              )}
              <VideoLabel>Stranger</VideoLabel>
              <Watermark>
                <WatermarkLogo src="/assets/logos/logo.png" alt="UniTalks Logo" />
                <WatermarkText>UniTalks</WatermarkText>
              </Watermark>
            </VideoFeed>
            
                    <VideoFeed>
                      {hasLocalStream ? (
                        <VideoElement
                          ref={localVideoRef}
                          autoPlay
                          muted
                          playsInline
                          style={{ transform: 'scaleX(-1)' }} // Mirror effect for self-view
                        />
                      ) : (
                        <VideoPlaceholder>
                          <FiVideo />
                          <div>Your Camera</div>
                        </VideoPlaceholder>
                      )}
                      <VideoOverlayButton
                        onClick={toggleAudio}
                        className={audioEnabled ? 'active' : ''}
                        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                      >
                        {audioEnabled ? <FiMic /> : <FiMicOff />}
                      </VideoOverlayButton>
                      <MobileVideoControls>
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
                      </MobileVideoControls>
                    </VideoFeed>
          </VideoFeedsContainer>
          
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
                      <SkipButton
                        onClick={skipPartner}
                        title="Skip to next stranger"
                        disabled={!isStarted}
                        style={{ opacity: isStarted ? 1 : 0.5, cursor: isStarted ? 'pointer' : 'not-allowed' }}
                      >
                        SKIP
                      </SkipButton>
                      
                      {isWaiting && !isConnected ? (
                        <StartStopButton 
                          onClick={cancelSearch}
                          $isStarted={false}
                          title="Cancel search"
                        >
                          CANCEL
                        </StartStopButton>
                      ) : (
                        <StartStopButton 
                          onClick={isStarted ? stopChat : startNewChat}
                          $isStarted={isStarted}
                          title={isStarted ? "Stop chat" : "Start new chat"}
                        >
                          {isStarted ? "STOP" : "START"}
                        </StartStopButton>
                      )}
                     </ChatControls>
                   </BottomControlsSection>
          </ChatSection>
        </VideoSection>
      </MainContent>
      
    </VideoChatContainer>
  );
}

export default VideoChat;
