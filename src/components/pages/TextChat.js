/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { FiSend, FiSmile, FiMessageCircle, FiSquare, FiSkipForward, FiMic, FiVideo } from 'react-icons/fi';
import SimplePeer from 'simple-peer';
import Header from '../layout/Header';
import { socketService } from '../../utils/socketService';
import { getRtcConfig, ESTABLISHMENT_DELAY_THRESHOLD_MS, STUN_SERVERS } from '../../utils/webrtcStun';

// Minimal process polyfill for simple-peer in browser builds
if (typeof window !== 'undefined') {
  const proc = window.process || {};
  if (!proc.env) proc.env = {};
  if (typeof proc.nextTick !== 'function') {
    proc.nextTick = (cb, ...args) => Promise.resolve().then(() => cb(...args));
  }
  window.process = proc;
}

/* ── Amber Paper: text chat ─────────────────────────────────────────── */

const TextChatContainer = styled.div`
  height: 100vh;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.ink};
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 88px 24px 20px;

  @media (max-width: 768px) { padding: 68px 12px 12px; }
`;

const ChatSection = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/* Status strip above the paper slate */
const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatusCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const LivePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
`;

const Bead = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme, $state }) =>
    $state === 'live' ? theme.colors.green
    : $state === 'searching' ? theme.colors.orange
    : theme.colors.muted};
`;

const ModeSwitch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
`;

const ModeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  color: ${({ theme, $active }) => ($active ? theme.colors.paper : theme.colors.ink)};
  background: ${({ theme, $active }) => ($active ? theme.colors.ink : 'transparent')};
  transition: background 0.15s ease;

  &:hover { background: ${({ theme, $active }) => ($active ? theme.colors.ink : theme.colors.sunTint)}; }
`;

/* The white paper slate holding the conversation */
const ChatBox = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  overflow: hidden;
  margin-bottom: ${({ $keyboardHeight }) => ($keyboardHeight ? `${$keyboardHeight}px` : '0')};

  @media (max-width: 768px) { border-radius: ${({ theme }) => theme.radii.panel}; }
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};

  @media (max-width: 768px) { padding: 14px 16px 12px; }
`;

const ChatTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 2px;

  @media (max-width: 768px) { font-size: 20px; }
`;

const ChatSubtitle = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.muted};
  margin: 0;
`;

const ChatMessages = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) { padding: 14px; }
`;

const pop = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Message = styled.div`
  position: relative;
  max-width: 74%;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radii.bubble};
  font-size: 15.5px;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
  cursor: pointer;
  animation: ${pop} 0.26s cubic-bezier(0.34, 1.4, 0.64, 1);

  &.own {
    align-self: flex-end;
    background: ${({ theme }) => theme.colors.blue};
    color: ${({ theme }) => theme.colors.paper};
    border: 1.5px solid ${({ theme }) => theme.colors.blue};
    border-bottom-right-radius: 4px;
  }

  &.other {
    align-self: flex-start;
    background: ${({ theme }) => theme.colors.paper};
    color: ${({ theme }) => theme.colors.ink};
    border: 1.5px solid ${({ theme }) => theme.colors.ink};
    border-bottom-left-radius: 4px;
  }

  @media (max-width: 768px) { max-width: 86%; font-size: 15px; }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.muted};
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 6px;
`;

const EmptyTitle = styled.p`
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0;
`;

const EmptyText = styled.p`
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  max-width: 320px;
`;

const ReplyIndicator = styled.div`
  border-left: 3px solid currentColor;
  padding: 4px 0 4px 10px;
  margin-bottom: 7px;
  opacity: 0.72;
`;

const ReplyText = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 2px;
`;

const ReplyContentSmall = styled.div`
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatInput = styled.div`
  position: relative;
  padding: 14px 18px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  @media (max-width: 768px) { padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); }
`;

const ReplyPreview = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.paperAlt};
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-left: 3px solid ${({ theme }) => theme.colors.blue};
  border-radius: 10px;
  padding: 8px 40px 8px 12px;
  margin-bottom: 10px;
`;

const ReplyContent = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.ink};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ReplyCancel = styled.button`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.paperAlt};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.control};
  padding: 6px 6px 6px 8px;

  &:focus-within { outline: 2px solid ${({ theme }) => theme.colors.sun}; outline-offset: 2px; }
`;

const MessageInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 40px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15.5px;
  font-weight: 500;
  padding: 0 6px;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus { outline: none; }
  &:disabled { cursor: not-allowed; }
`;

const IconCircle = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  border: none;
  transition: transform 0.12s ease, background 0.15s ease;

  &:active:not(:disabled) { transform: scale(0.94); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmojiButton = styled(IconCircle)`
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.line}; }
`;

const SendButton = styled(IconCircle)`
  background: ${({ theme }) => theme.colors.blue};
  color: ${({ theme }) => theme.colors.paper};

  &:hover:not(:disabled) { background: #1F6FE8; }
`;

const EmojiPicker = styled.div`
  position: absolute;
  bottom: calc(100% - 4px);
  left: 18px;
  right: 18px;
  max-height: 200px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
  gap: 4px;
  z-index: 20;
  box-shadow: 0 4px 0 ${({ theme }) => theme.colors.ink};
`;

const EmojiItem = styled.button`
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 21px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease;

  &:hover { background: ${({ theme }) => theme.colors.sunTint}; }
  &:active { transform: scale(0.9); }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ theme }) => theme.colors.red};
  color: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.control};
  padding: 12px 16px;
  font-size: 14.5px;
  font-weight: 700;
`;

const StatusMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.sunDeep};
  border-radius: ${({ theme }) => theme.radii.control};
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
`;

const BottomControlsSection = styled.div`
  display: flex;
  justify-content: center;
`;

const ChatControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: 999px;

  @media (max-width: 560px) {
    width: 100%;
    border-radius: ${({ theme }) => theme.radii.control};
    justify-content: center;
  }
`;

const ButtonIcon = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 17px;
`;

const ControlBase = styled.button`
  height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  transition: transform 0.12s ease, background 0.15s ease;

  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 560px) { flex: 1; padding: 0 14px; }
`;

const StartChatButton = styled(ControlBase)`
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.inkSoft}; }
`;

const StopButton = styled(ControlBase)`
  background: ${({ theme }) => theme.colors.red};
  color: ${({ theme }) => theme.colors.paper};
  &:hover:not(:disabled) { background: #E5342A; }
`;

const SkipButton = styled(ControlBase)`
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.sunTint}; }
`;

/** Seconds -> M:SS, for the live session timer in the status pill. */
function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TextChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [waitingMessage, setWaitingMessage] = useState('');
  
  // Live session timer - resets on every new connection.
  useEffect(() => {
    if (!isConnected) {
      setElapsed(0);
      return undefined;
    }
    setElapsed(0);
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  const messagesEndRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const partnerIdRef = useRef(null);
  const isInitiatorRef = useRef(false);
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

  const cleanupPeer = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.destroy?.();
      peerConnectionRef.current = null;
    }
    partnerIdRef.current = null;
  };

  const resetForRequeue = (message = '') => {
    setIsConnected(false);
    setIsWaiting(true);
    setWaitingMessage(message);
    setMessages([]);
    setReplyingTo(null);
    setError('');
    cleanupPeer();
    
    // Auto-requeue for text mode
    setTimeout(() => {
      socketService.send({ type: 'join', mode: 'text' });
      console.log('[socket] 🔄 rejoining TEXT queue');
    }, 100);
  };

  const setupWebRTC = async (isInitiator) => {
    try {
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true,
        config: getRtcConfig(stunServerIndexRef.current),
      });
      peerConnectionRef.current = peer;
      isInitiatorRef.current = isInitiator;

      peer.on('signal', (sig) => {
        if (!partnerIdRef.current) return;
        const signalType = sig.type || (sig.candidate ? 'ice' : 'offer');
        socketService.send({ type: 'signal', signalType, data: sig });
      });

      peer.on('connect', () => {
        recordEstablishmentTime();
        setIsConnected(true);
        setIsWaiting(false);
        setWaitingMessage('');
        console.log('TextChat: WebRTC Connected');
      });

      peer.on('close', () => {
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

  const startNewChat = async () => {
    try {
      setIsConnected(false);
      setIsWaiting(false);
      setWaitingMessage('');
      setError('');
      setIsStarted(false);

      const socket = await socketService.connect().catch(() => null);
      if (!socket) {
        setError('Unable to connect to server. Please try again.');
        setIsStarted(false);
        return;
      }

      setIsStarted(true);
      setIsWaiting(true);
      setWaitingMessage('Looking for a partner...');
      socketService.send({ type: 'join', mode: 'text' });
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
    socketService.disconnect();
    partnerIdRef.current = null;
  };

  const cancelSearch = () => {
    if (isWaiting && !isConnected) {
      socketService.send({ type: 'cancel' });
      setIsWaiting(false);
      setWaitingMessage('');
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
    
    const socket = socketService.getSocket() || await socketService.connect().catch(() => null);
    if (socket) {
      socketService.send({ type: 'skip' });
      setTimeout(() => {
        socketService.send({ type: 'join', mode: 'text' });
        console.log('[socket] ⏭️ skipped + rejoining TEXT queue');
      }, 100);
    } else {
      setError('Unable to reconnect. Please restart.');
      setIsStarted(false);
      setIsWaiting(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const replyToMessage = (message) => {
    setReplyingTo(message);
    setShowEmojiPicker(false);
  };
  const cancelReply = () => setReplyingTo(null);

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      if (isStarted) {
        socketService.send({ type: 'leave' });
      }
      cleanupPeer();
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
      setIsConnected(false);
      connectionStartTimeRef.current = Date.now();
      establishmentRecordedRef.current = false;

      console.log('[ws] 🎯 matched with', data.partnerId);

      socketService.send({ type: 'acknowledge' });
      await setupWebRTC(data.initiator);
    };

    const handleSessionReady = () => setWaitingMessage('Connected! Say Hi 👋');
    const handleSearchCancelled = () => {
      setIsWaiting(false);
      setWaitingMessage('');
    };

    const handleSignal = (data) => {
      handleWebRTCSignal({ signal: data.data });
    };

    const handlePartnerLeft = () => resetForRequeue('Partner disconnected. Rejoining queue...');
    const handlePartnerSkipped = () => resetForRequeue('Partner skipped. Rejoining queue...');

    const handleQueue = (data) => {
      setIsWaiting(true);
      setIsConnected(false);
      const position = data.position || 1;
      setWaitingMessage(position === 1 ? 'Looking for a partner...' : `In queue (position ${position})`);
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

  // Waiting message timeout
  useEffect(() => {
    let timer;
    if (isWaiting && !isConnected) {
      timer = setTimeout(() => {
        setWaitingMessage('Still looking for a partner...');
      }, 8000);
    } else {
      // Don't clear if connected, unless user is chatting
      if (!isConnected) setWaitingMessage('');
    }
    return () => timer && clearTimeout(timer);
  }, [isWaiting, isConnected]);

  return (
    <TextChatContainer>
      <Header logo="Unitalks" hasSidebar={false} />
      
      <MainContent>
        <ChatSection>
          <StatusBar>
            <StatusCluster>
              <LivePill>
                <Bead $state={isConnected ? 'live' : isWaiting ? 'searching' : 'idle'} />
                {isConnected ? 'Live' : isWaiting ? 'Searching' : 'Idle'}
                {isConnected && <span>· {formatElapsed(elapsed)}</span>}
              </LivePill>
            </StatusCluster>
            <ModeSwitch>
              <ModeLink to="/text" $active><FiMessageCircle /> Text</ModeLink>
              <ModeLink to="/voice"><FiMic /> Voice</ModeLink>
              <ModeLink to="/video"><FiVideo /> Video</ModeLink>
            </ModeSwitch>
          </StatusBar>

          {error && !error.includes('already') && <ErrorMessage>{error}</ErrorMessage>}
          {waitingMessage && <StatusMessage>{waitingMessage}</StatusMessage>}

          <ChatBox $keyboardHeight={keyboardHeight}>
            <ChatHeader>
              <div>
                <ChatTitle>
                  Messages
                  <Bead $state={isConnected ? 'live' : isWaiting ? 'searching' : 'idle'} />
                </ChatTitle>
                <ChatSubtitle>
                  {isConnected
                    ? 'Connected to a stranger · anonymous & ephemeral'
                    : isWaiting
                      ? 'Looking for someone to talk to…'
                      : 'Press Start Chat to meet a stranger'}
                </ChatSubtitle>
              </div>
            </ChatHeader>

            <ChatMessages>
              {messages.length === 0 && (
                <EmptyState>
                  <EmptyIcon><FiMessageCircle /></EmptyIcon>
                  <EmptyTitle>
                    {isConnected ? 'Say hi 👋' : isWaiting ? 'Hang tight…' : 'No messages yet'}
                  </EmptyTitle>
                  <EmptyText>
                    {isConnected
                      ? 'You are matched. Messages go straight to the other student and vanish when you leave.'
                      : isWaiting
                        ? 'Finding another student who is online right now.'
                        : 'Start a chat to get matched with a random student.'}
                  </EmptyText>
                </EmptyState>
              )}
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
                  disabled={!isConnected && isStarted}
                />
                <EmojiButton onClick={toggleEmojiPicker} disabled={!isConnected && isStarted}>
                  <FiSmile />
                </EmojiButton>
                <SendButton onClick={sendMessage} disabled={!isConnected && isStarted}>
                  <FiSend />
                </SendButton>
              </InputRow>
              {showEmojiPicker && (
                <EmojiPicker>
                  {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '💯', '👏', '🙌', '😊', '😘', '🤗', '😴', '🤤', '😋', '🥳', '😇', '😮', '😯', '😵', '😶', '😷', '🤒'].map((emoji) => (
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
      </MainContent>
    </TextChatContainer>
  );
}

export default TextChat;
