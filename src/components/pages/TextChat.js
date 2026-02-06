/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiSend, FiSmile } from 'react-icons/fi';
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

const TextChatContainer = styled.div`
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
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ChatSection = styled.div`
  width: 100%;
  max-width: 800px; /* Centered, max-width for readability */
  height: 100%;
  background: #000000;
  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  
  @media (max-width: 768px) {
    border-radius: 0;
    border: none;
    max-width: 100%;
    padding: 0;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
  z-index: 5;
  width: 100%;
  
  @media (max-width: 768px) {
    position: fixed;
    top: 70px;
    bottom: ${props => props.$keyboardHeight ? `${props.$keyboardHeight}px` : '0'};
    left: 0;
    right: 0;
    height: auto;
    width: 100%;
    transition: bottom 0.3s ease;
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  @media (max-width: 768px) {
    padding: 15px;
    padding-bottom: 100px; /* Space for input/controls */
    scroll-behavior: smooth;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 2px; }
    &::-webkit-scrollbar-thumb { background: rgba(29,185,84,0.5); border-radius: 2px; }
  }
`;

const Message = styled.div`
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 1rem;
  max-width: 70%;
  word-wrap: break-word;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.5;
  
  &.own {
    background: rgba(29,185,84,0.2);
    color: #fff;
    align-self: flex-end;
    border: 1px solid rgba(29,185,84,0.4);
    border-bottom-right-radius: 4px;
  }
  
  &.other {
    background: rgba(255,255,255,0.1);
    color: #fff;
    align-self: flex-start;
    border: 1px solid rgba(255,255,255,0.2);
    border-bottom-left-radius: 4px;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
`;

const ReplyPreview = styled.div`
  background: rgba(29,185,84,0.1);
  border-left: 3px solid #1DB954;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1DB954;
  position: relative;
`;

const ReplyText = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
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
  font-size: 0.8rem;
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
  padding: 15px 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  gap: 8px;
  background: rgba(0,0,0,0.8);
  
  @media (max-width: 768px) {
    padding: 12px;
    background: rgba(0,0,0,0.95);
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 1rem;
  
  &:focus { outline: none; border-color: rgba(29,185,84,0.6); }
  &::placeholder { color: #666; }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(29,185,84,0.5);
  }
`;

const SendButton = styled.button`
  padding: 12px;
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 8px;
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
  padding: 12px;
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 8px;
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
  bottom: 80px;
  left: 20px;
  right: 20px;
  max-width: 100%;
  max-height: 160px;
  background: rgba(0,0,0,0.95);
  border: 1px solid rgba(29,185,84,0.3);
  border-radius: 8px;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 4px;
  backdrop-filter: blur(10px);
  z-index: 10;
  overflow-y: auto;
`;

const EmojiItem = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover { background: rgba(29,185,84,0.2); }
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
  width: 90%;
  align-self: center;
`;

const StatusMessage = styled.div`
  color: #1DB954;
  font-size: 0.9rem;
  text-align: center;
  padding: 8px;
  font-weight: 500;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`;

const BottomControlsSection = styled.div`
  height: 80px;
  background: rgba(0,0,0,0.6);
  border-top: 1px solid rgba(29,185,84,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const ChatControls = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 10px;
  }
`;

function TextChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [waitingMessage, setWaitingMessage] = useState('');
  
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
          {error && !error.includes('already') && <ErrorMessage>{error}</ErrorMessage>}
          {waitingMessage && <StatusMessage>{waitingMessage}</StatusMessage>}
          
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
      </MainContent>
    </TextChatContainer>
  );
}

export default TextChat;
