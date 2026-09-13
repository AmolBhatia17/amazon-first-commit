/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { FiVideo, FiMic, FiMicOff, FiSkipForward, FiSkipBack, FiUsers, FiSend, FiSmile, FiMessageCircle, FiSquare, FiZap, FiHeadphones, FiPlay } from 'react-icons/fi';
import SimplePeer from 'simple-peer';
import Header from '../layout/Header';
import { socketService } from '../../utils/socketService';
import { getRtcConfig, ESTABLISHMENT_DELAY_THRESHOLD_MS, STUN_SERVERS } from '../../utils/webrtcStun';
import { createInitialState, applyMove as applyChessMove } from '../../utils/chessEngine';
import ChessBoard from '../ui/ChessBoard';

// Minimal process polyfill for simple-peer in browser builds
if (typeof window !== 'undefined') {
  const proc = window.process || {};
  if (!proc.env) proc.env = {};
  if (typeof proc.nextTick !== 'function') {
    proc.nextTick = (cb, ...args) => Promise.resolve().then(() => cb(...args));
  }
  window.process = proc;
}

/* ── Amber Paper: video chat (dark ink canvas) ──────────────────────── */

const VideoChatContainer = styled.div`
  height: 100vh;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 88px 20px 16px;

  @media (max-width: 900px) { padding: 60px 0 0; }
`;

/* ── Video area ─────────────────────────────────────────────────────── */
/* Desktop: video + control bar on the left, chat slate on the right.    */
/* Mobile:  video fills the screen and the chat becomes an overlay sheet.*/

const VideoSection = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 400px;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 12px 16px;

  @media (max-width: 1100px) { grid-template-columns: 1fr 340px; }
  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    position: relative;
    gap: 0;
  }
`;

const VideoFeedsContainer = styled.div`
  position: relative;
  grid-column: 1;
  grid-row: 1;
  min-height: 0;
  border-radius: ${({ theme }) => theme.radii.card};
  overflow: hidden;

  /* Mobile: stop at the chat sheet's top edge so the floating control
     bar at the bottom of the video is not hidden behind the sheet. */
  @media (max-width: 900px) {
    flex: 0 0 46%;
    border-radius: 0;
  }
`;

const VideoFeed = styled.div`
  position: ${({ $isRemote }) => ($isRemote ? 'relative' : 'absolute')};
  overflow: hidden;
  background: #000;

  ${({ $isRemote, theme }) => $isRemote ? `
    width: 100%;
    height: 100%;
    border: 1.5px solid rgba(255,255,255,0.16);
    border-radius: ${theme.radii.card};
  ` : `
    right: 16px;
    bottom: 96px;
    width: 168px;
    height: 118px;
    z-index: 6;
    border: 2px solid ${theme.colors.paper};
    border-radius: ${theme.radii.panel};
  `}

  /* Mobile: the self-view moves to the top-right so the bottom band belongs
     entirely to the floating control bar. */
  @media (max-width: 900px) {
    ${({ $isRemote }) => $isRemote ? `
      border: none;
      border-radius: 0;
    ` : `
      right: 10px;
      top: 12px;
      bottom: auto;
      width: 86px;
      height: 116px;
      border-width: 2px;
      border-radius: 14px;
    `}
  }
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
`;

const VideoPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.colors.inkSoft};
  color: rgba(255, 255, 255, 0.55);
  font-size: 15px;
  font-weight: 700;

  svg { font-size: 34px; }
`;

const VideoLabel = styled.div`
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.green};
  }
`;

const RemoteBufferOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 7;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(28, 28, 30, 0.72);
`;

const VideoOverlayButton = styled.button`
  position: absolute;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active { transform: scale(0.96); }
`;

/* Floating grouped toolbar over the video on mobile */
const MobileVideoControls = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: flex;
    position: absolute;
    left: 50%;
    bottom: calc(16px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 9;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.inkSoft};
    border: 1.5px solid rgba(255, 255, 255, 0.18);
  }
`;

const MobileControlButton = styled.button`
  height: 48px;
  min-width: 48px;
  padding: 0 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: ${({ theme }) => theme.colors.paper};
  transition: transform 0.12s ease, background 0.15s ease;

  &:active { transform: scale(0.94); }

  &.start {
    background: ${({ theme }) => theme.colors.sun};
    color: ${({ theme }) => theme.colors.ink};
    padding: 0 22px;
  }
  &.stop { background: ${({ theme }) => theme.colors.red}; }
  &.skip { background: ${({ theme }) => theme.colors.paper}; color: ${({ theme }) => theme.colors.ink}; }
  &.fun  { background: ${({ theme }) => theme.colors.sun}; color: ${({ theme }) => theme.colors.ink}; }
  &.danger { background: ${({ theme }) => theme.colors.red}; }
`;

const FunMobileControls = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: flex;
    position: absolute;
    left: 12px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 9;
    gap: 8px;
  }
`;

const FunMobileButton = styled.button`
  height: 48px;
  padding: 0 16px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.sun};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active { transform: scale(0.95); }
`;

const Watermark = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(28, 28, 30, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.18);

  @media (max-width: 560px) { display: none; }
`;

const WatermarkLogo = styled.img`
  height: 18px;
  width: auto;
  object-fit: contain;
`;

const WatermarkText = styled.span`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.paper};
`;

/* ── Chat column (the white paper slate) ────────────────────────────── */

const ChatSection = styled.div`
  grid-column: 2;
  grid-row: 1 / span 2;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid rgba(255, 255, 255, 0.16);
  border-radius: ${({ theme }) => theme.radii.card};
  overflow: hidden;

  @media (max-width: 900px) {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: ${({ $mobileChatTop }) => ($mobileChatTop != null ? `${$mobileChatTop}px` : '46%')};
    z-index: 12;
    border: none;
    border-top: 1.5px solid ${({ theme }) => theme.colors.ink};
    border-radius: ${({ theme }) => theme.radii.card} ${({ theme }) => theme.radii.card} 0 0;
  }
`;

const ChessArea = styled.div`
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`;

/* ── Listen Along music player ──────────────────────────────────────── */

const MusicPlayerContainer = styled.div`
  padding: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.paperAlt};
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 58%;
  overflow-y: auto;
`;

const MusicSearchSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MusicTrackInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 14.5px;
  font-weight: 500;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus { outline: 2px solid ${({ theme }) => theme.colors.sun}; outline-offset: 2px; }
`;

const MusicStatusText = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.muted};
`;

const MusicPlayerMain = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const MusicArtworkSection = styled.div`
  flex-shrink: 0;
`;

const MusicArtwork = styled.img`
  width: 74px;
  height: 74px;
  border-radius: ${({ theme }) => theme.radii.panel};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  object-fit: cover;
  display: block;
  background: ${({ theme }) => theme.colors.sunTint};
`;

const MusicInfoSection = styled.div`
  flex: 1;
  min-width: 0;
`;

const MusicTitle = styled.div`
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.ink};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MusicArtist = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MusicDurationText = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.muted};
  font-variant-numeric: tabular-nums;
`;

const MusicProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MusicEqualizer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 24px;
`;

const eqBarPulse = keyframes`
  0%, 100% { height: 25%; }
  50%      { height: 100%; }
`;

const MusicEqualizerBar = styled.div`
  width: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.ink};
  height: 25%;
  animation: ${eqBarPulse} 0.9s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay || '0s'};
  animation-play-state: ${({ $isPlaying }) => ($isPlaying ? 'running' : 'paused')};
`;

const MusicProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MusicProgressInput = styled.input`
  flex: 1;
  min-width: 0;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.line};
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.ink};
    border: 2px solid ${({ theme }) => theme.colors.paper};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.ink};
    border: 2px solid ${({ theme }) => theme.colors.paper};
    cursor: pointer;
  }
`;

const MusicTimeText = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.muted};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
`;

const MusicControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const MusicControlButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  transition: transform 0.12s ease, background 0.15s ease;

  &:active:not(:disabled) { transform: scale(0.94); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &.primary {
    width: 52px;
    height: 52px;
    font-size: 21px;
    background: ${({ theme }) => theme.colors.ink};
    color: ${({ theme }) => theme.colors.paper};
  }
`;

const MusicLyricsSection = styled.div`
  max-height: 132px;
  overflow-y: auto;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radii.panel};
  background: ${({ theme }) => theme.colors.paper};
  border: 1px solid ${({ theme }) => theme.colors.line};
`;

const MusicLyricsText = styled.div`
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.muted};
  white-space: pre-wrap;
`;

/* ── Chat header ────────────────────────────────────────────────────── */

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const BrandText = styled.span`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.ink};
`;

const StatusMessage = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1px solid ${({ theme }) => theme.colors.sunDeep};
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
`;

const NewChatButton = styled.button`
  height: 40px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active { transform: scale(0.96); }
`;

const InterestSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`;

const InterestText = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.muted};
`;

const LanguageLink = styled.a`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.blue};
  text-decoration: none;
  cursor: pointer;

  &:hover { text-decoration: underline; }
`;

/* ── Desktop control bar ────────────────────────────────────────────── */

const BottomControlsSection = styled.div`
  grid-column: 1;
  grid-row: 2;
  display: flex;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 900px) { display: none; }
`;

const ChatControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.inkSoft};
  border: 1.5px solid rgba(255, 255, 255, 0.16);
`;

const ChatControlsCentered = styled(ChatControls)``;
const ChatControlsStartRight = styled(ChatControls)``;
const ChatControlsRight = styled(ChatControls)``;

const ButtonIcon = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 17px;
`;

const ControlButton = styled.button`
  height: 48px;
  min-width: 48px;
  padding: 0 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: ${({ theme }) => theme.colors.paper};
  transition: transform 0.12s ease, background 0.15s ease;

  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.2); }
  &:active:not(:disabled) { transform: scale(0.96); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const StartChatButton = styled(ControlButton)`
  background: ${({ theme }) => theme.colors.sun};
  color: ${({ theme }) => theme.colors.ink};
  padding: 0 26px;

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.sunDeep}; }
`;

const StopButton = styled(ControlButton)`
  background: ${({ theme }) => theme.colors.red};
  color: ${({ theme }) => theme.colors.paper};

  &:hover:not(:disabled) { background: #E5342A; }
`;

const SkipButton = styled(ControlButton)`
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.sunTint}; }
`;

const FunButton = styled(ControlButton)`
  background: ${({ theme }) => theme.colors.sun};
  color: ${({ theme }) => theme.colors.ink};

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.sunDeep}; }
`;

/* ── FUN menu ───────────────────────────────────────────────────────── */

const MobileFunWrap = styled.div`
  position: relative;
`;

const FunMenuWrap = styled.div`
  position: relative;
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const FunMenuPopover = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 230px;
  z-index: 40;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 8px;
  box-shadow: 0 4px 0 ${({ theme }) => theme.colors.ink};
  animation: ${popIn} 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
`;

const FunMenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 14.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;

  &:hover { background: ${({ theme }) => theme.colors.sunTint}; }
  &:active { transform: scale(0.98); }
`;

const FunSubmenu = styled.div`
  padding-left: 10px;
  margin-left: 8px;
  border-left: 2px solid ${({ theme }) => theme.colors.line};
`;

const FunRequestOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(28, 28, 30, 0.55);
`;

const FunRequestCard = styled.div`
  width: 100%;
  max-width: 400px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 26px;
  text-align: center;
  animation: ${popIn} 0.26s cubic-bezier(0.34, 1.4, 0.64, 1);
  box-shadow: 0 5px 0 ${({ theme }) => theme.colors.ink};
`;

const FunRequestText = styled.p`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 20px;

  strong { font-weight: 800; }
`;

const FunRequestActions = styled.div`
  display: flex;
  gap: 10px;

  > * { flex: 1; }
`;

const FunButtonSmall = styled.button`
  height: 48px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radii.control};
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  transition: transform 0.12s ease, background 0.15s ease;

  &:hover { background: ${({ theme }) => theme.colors.sunTint}; }
  &:active { transform: scale(0.97); }
`;

/* ── Messages ───────────────────────────────────────────────────────── */

const ChatBox = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: ${({ $keyboardHeight }) => ($keyboardHeight ? `${$keyboardHeight}px` : '0')};
`;

const ChatMessages = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const pop = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Message = styled.div`
  position: relative;
  max-width: 82%;
  padding: 11px 14px;
  border-radius: ${({ theme }) => theme.radii.bubble};
  font-size: 15px;
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
`;

const ReplyIndicator = styled.div`
  border-left: 3px solid currentColor;
  padding: 3px 0 3px 9px;
  margin-bottom: 6px;
  opacity: 0.72;
`;

const ReplyText = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 2px;
`;

const ReplyContentSmall = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatInput = styled.div`
  position: relative;
  padding: 12px 14px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  @media (max-width: 900px) { padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
`;

const ReplyPreview = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.paperAlt};
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-left: 3px solid ${({ theme }) => theme.colors.blue};
  border-radius: 10px;
  padding: 8px 38px 8px 11px;
  margin-bottom: 9px;
`;

const ReplyContent = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.ink};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ReplyCancel = styled.button`
  position: absolute;
  top: 50%;
  right: 7px;
  transform: translateY(-50%);
  width: 25px;
  height: 25px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.colors.paperAlt};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.control};
  padding: 5px 5px 5px 8px;

  &:focus-within { outline: 2px solid ${({ theme }) => theme.colors.sun}; outline-offset: 2px; }
`;

const MessageInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 38px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15px;
  font-weight: 500;
  padding: 0 4px;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus { outline: none; }
  &:disabled { cursor: not-allowed; }
`;

const IconCircle = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
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
  left: 14px;
  right: 14px;
  max-height: 190px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 3px;
  z-index: 30;
  box-shadow: 0 4px 0 ${({ theme }) => theme.colors.ink};
`;

const EmojiItem = styled.button`
  height: 38px;
  border: none;
  background: transparent;
  border-radius: 9px;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease;

  &:hover { background: ${({ theme }) => theme.colors.sunTint}; }
  &:active { transform: scale(0.9); }
`;

/* ── Feedback ───────────────────────────────────────────────────────── */

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(0.94); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const WaitingIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.paper};
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

const BufferSpinner = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: ${({ theme }) => theme.colors.sun};
  animation: ${spin} 0.8s linear infinite;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  background: ${({ theme }) => theme.colors.red};
  color: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.control};
  padding: 11px 14px;
  margin: 12px 14px 0;
  font-size: 14px;
  font-weight: 700;
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
  const [mobileChatTop, setMobileChatTop] = useState(null);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [showRemoteBuffer, setShowRemoteBuffer] = useState(false);
  const [showFunMenu, setShowFunMenu] = useState(false);
  const [showPlayAlongSubmenu, setShowPlayAlongSubmenu] = useState(true);
  const [funToken, setFunToken] = useState(0);
  const [pendingFunRequest, setPendingFunRequest] = useState(null);
  const [acceptedFunGame, setAcceptedFunGame] = useState(null);
  const [amIWhite, setAmIWhite] = useState(true);
  const [chessState, setChessState] = useState(createInitialState);
  const [isMusicHost, setIsMusicHost] = useState(false);
  const [musicTrackUrl, setMusicTrackUrl] = useState('');
  const [musicTrackTitle, setMusicTrackTitle] = useState('');
  const [musicTrackArtist, setMusicTrackArtist] = useState('');
  const [musicTrackArtwork, setMusicTrackArtwork] = useState('');
  const [musicTrackLyrics, setMusicTrackLyrics] = useState('');
  const [musicTrackDuration, setMusicTrackDuration] = useState(0);
  const [saavnQuery, setSaavnQuery] = useState('');
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [musicIsPlaying, setMusicIsPlaying] = useState(false);
  const [musicPosition, setMusicPosition] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const hasRemoteStreamRef = useRef(false);
  const funMenuRef = useRef(null);
  const funMenuMobileRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const musicAudioRef = useRef(null);
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
        applyRemoteStream();
        setIsConnected(true);
        setIsWaiting(false);
        setShowRemoteBuffer(false);
        hasRemoteStreamRef.current = true;
      });

      // Fallback for browsers emitting 'track'
      peer.on('track', (track, stream) => {
        console.log('Peer track event', track, stream);
        recordEstablishmentTime();
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(track);
        track.onunmute = () => {
          applyRemoteStream();
        };
        applyRemoteStream();
        // Re-apply after a short delay when video track arrives (helps mobile / delayed frames)
        if (track.kind === 'video') {
          setTimeout(applyRemoteStream, 300);
          setTimeout(applyRemoteStream, 800);
        }
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
          let obj = null;
          try { obj = JSON.parse(text); } catch (_) {}
          if (obj && obj.type === 'chess-move') {
            setChessState((prev) => {
              const next = applyChessMove(prev, { from: obj.from, to: obj.to, promotion: obj.promotion });
              return next || prev;
            });
            return;
          }
          if (obj && obj.type === 'music-control') {
            handleIncomingMusicControl(obj);
            return;
          }
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
    if (!remoteStreamRef.current || !remoteVideoRef.current) return;
    const video = remoteVideoRef.current;
    const stream = remoteStreamRef.current;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    // Mobile: start muted so play() is allowed by autoplay policy, then unmute
    video.muted = true;
    video.volume = 1;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    const playPromise = video.play?.();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        if (err && err.name !== 'AbortError') console.error('Remote play error', err);
      });
    }
    // Unmute after play has started (required on iOS/Safari and some Android)
    const unmute = () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };
    setTimeout(unmute, 400);
    // Extra kick for mobile: re-apply and play on canplay
    const onCanPlay = () => {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject === stream) {
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };
    video.removeEventListener('canplay', onCanPlay);
    video.addEventListener('canplay', onCanPlay, { once: true });
  };

  const resetForRequeue = (message = '') => {
    setIsConnected(false);
    setIsWaiting(true);
    setWaitingMessage(message);
    setMessages([]);
    setReplyingTo(null);
    setFunToken(0);
    setPendingFunRequest(null);
    setAcceptedFunGame(null);
    setChessState(createInitialState());
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

  const sendMusicControl = (payload) => {
    const peer = peerConnectionRef.current;
    if (!peer || typeof peer.send !== 'function') return;
    try {
      peer.send(JSON.stringify({
        type: 'music-control',
        ...payload,
        sentAt: Date.now(),
      }));
    } catch (e) {
      console.error('Music control send error', e);
    }
  };

  const applyMusicStateToAudio = (trackUrl, isPlaying, positionSeconds) => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    if (trackUrl && audio.src !== trackUrl) {
      audio.src = trackUrl;
    }
    if (!Number.isNaN(positionSeconds) && isFinite(positionSeconds)) {
      try {
        audio.currentTime = Math.max(0, positionSeconds);
      } catch (_) {}
    }
    if (isPlaying) {
      audio.play?.().catch(err => console.error('Music play error', err));
    } else {
      audio.pause?.();
    }
  };

  const JIOSAAVN_API_BASE = 'https://saavnapi-nine.vercel.app/result/?query=';

  const formatDuration = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadSaavnTrack = async () => {
    const query = saavnQuery.trim();
    if (!query) return;
    try {
      setIsLoadingTrack(true);
      // Hard-stop any currently playing track before loading a new one
      const existingAudio = musicAudioRef.current;
      if (existingAudio) {
        try {
          existingAudio.pause();
          existingAudio.currentTime = 0;
        } catch (_) {}
      }
      const resp = await fetch(`${JIOSAAVN_API_BASE}${encodeURIComponent(query)}&lyrics=true`);
      const data = await resp.json().catch(() => null);
      const first = Array.isArray(data) ? data[0] : data;
      if (!first || !(first.media_url || first.url)) {
        console.error('JioSaavn API: no playable link', data);
        return;
      }
      const streamUrl = first.media_url || first.url;
      const title = first.song || first.title || '';
      const artist = first.singers || first.music || '';
      const artwork = first.image || first.image_url || '';
      const lyrics = first.lyrics || '';
      const duration = parseInt(first.duration, 10) || 0;
      setMusicTrackUrl(streamUrl);
      setMusicTrackTitle(title);
      setMusicTrackArtist(artist);
      setMusicTrackArtwork(artwork);
      setMusicTrackLyrics(lyrics);
      setMusicTrackDuration(duration);
      setMusicDuration(duration);
      setMusicIsPlaying(true);
      setMusicPosition(0);
      applyMusicStateToAudio(streamUrl, true, 0);
      sendMusicControl({
        action: 'change-track',
        trackUrl: streamUrl,
        title,
        artist,
        artwork,
        lyrics,
        duration,
        position: 0,
      });
    } catch (e) {
      console.error('JioSaavn API error', e);
    } finally {
      setIsLoadingTrack(false);
    }
  };

  const handleIncomingMusicControl = (msg) => {
    const { action, trackUrl: incomingUrl, position, sentAt, title, artist, artwork, lyrics, duration } = msg;
    if (action === 'change-track') {
      const pos = typeof position === 'number' ? position : 0;
      setMusicTrackUrl(incomingUrl || '');
      setMusicTrackTitle(title || '');
      setMusicTrackArtist(artist || '');
      setMusicTrackArtwork(artwork || '');
      setMusicTrackLyrics(lyrics || '');
      const safeDuration = typeof duration === 'number' ? duration : 0;
      setMusicTrackDuration(safeDuration);
      if (safeDuration > 0) {
        setMusicDuration(safeDuration);
      }
      setMusicIsPlaying(true);
      setMusicPosition(pos);
      const effectivePos = sentAt ? pos + (Date.now() - sentAt) / 1000 : pos;
      applyMusicStateToAudio(incomingUrl || '', true, effectivePos);
      return;
    }
    if (action === 'play') {
      const pos = typeof position === 'number' ? position : musicPosition;
      setMusicIsPlaying(true);
      setMusicPosition(pos);
      const effectivePos = sentAt ? pos + (Date.now() - sentAt) / 1000 : pos;
      applyMusicStateToAudio(musicTrackUrl, true, effectivePos);
      return;
    }
    if (action === 'pause') {
      const pos = typeof position === 'number' ? position : musicPosition;
      setMusicIsPlaying(false);
      setMusicPosition(pos);
      applyMusicStateToAudio(musicTrackUrl, false, pos);
      return;
    }
    if (action === 'seek') {
      const pos = typeof position === 'number' ? position : musicPosition;
      // For seek we treat this as an authoritative hard reset to a specific point,
      // without trying to be clever with latency compensation. This matches the
      // "slider = seek event" rule and avoids over/under-shooting.
      setMusicPosition(pos);
      applyMusicStateToAudio(musicTrackUrl, musicIsPlaying, pos);
    }
  };

  useEffect(() => {
    // Attach listeners whenever the listen-along player is active and an
    // audio element is present. This covers the case where the player mounts
    // later (after FUN mode is accepted).
    const audio = musicAudioRef.current;
    if (!audio || acceptedFunGame !== 'listen-along') return;

    const handleTimeUpdate = () => {
      setMusicPosition(audio.currentTime || 0);
      if (!Number.isNaN(audio.duration) && isFinite(audio.duration)) {
        setMusicDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (!Number.isNaN(audio.duration) && isFinite(audio.duration)) {
        setMusicDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [acceptedFunGame, musicTrackUrl]);

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
    setFunToken(0);
    setPendingFunRequest(null);
    setAcceptedFunGame(null);
    setChessState(createInitialState());
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

  const handleChessMove = (move) => {
    const next = applyChessMove(chessState, move);
    if (!next) return;
    setChessState(next);
    const peer = peerConnectionRef.current;
    if (peer && typeof peer.send === 'function') {
      try {
        peer.send(JSON.stringify({ type: 'chess-move', from: move.from, to: move.to, promotion: move.promotion || undefined }));
      } catch (e) {
        console.error('Chess send error', e);
      }
    }
  };

  const exitFun = () => {
    socketService.send({ type: 'fun-exit' });
    setFunToken(0);
    setAcceptedFunGame(null);
    setChessState(createInitialState());
    setShowFunMenu(false);
    setShowPlayAlongSubmenu(false);
  };

  const skipPartner = async () => {
    if (!isStarted) return;
    
    cleanupPeer();
    
    setIsConnected(false);
    setIsWaiting(true);
    setWaitingMessage('');
    setMessages([]);
    setReplyingTo(null);
    setFunToken(0);
    setAcceptedFunGame(null);
    setChessState(createInitialState());
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

  useEffect(() => {
    if (!showFunMenu) return;
    // On desktop, close Fun menu when clicking outside; on mobile, rely on explicit actions
    if (window.innerWidth > 768) {
      const handleClickOutside = (e) => {
        const inDesktop = funMenuRef.current && funMenuRef.current.contains(e.target);
        if (!inDesktop) setShowFunMenu(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFunMenu]);

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

  // Position chat box above keyboard on mobile using visual viewport (keeps input attached to keyboard)
  const MOBILE_CHAT_HEIGHT = 200;
  useEffect(() => {
    const updateMobileChatPosition = () => {
      if (window.innerWidth > 768) return;
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const top = vv.offsetTop + vv.height - MOBILE_CHAT_HEIGHT;
        setMobileChatTop(top);
        const kh = window.innerHeight - vv.height;
        setKeyboardHeight(kh > 0 ? kh : 0);
      } else {
        setMobileChatTop(window.innerHeight - MOBILE_CHAT_HEIGHT);
        setKeyboardHeight(0);
      }
    };

    if (window.visualViewport) {
      updateMobileChatPosition();
      window.visualViewport.addEventListener('resize', updateMobileChatPosition);
      window.visualViewport.addEventListener('scroll', updateMobileChatPosition);
    } else {
      window.addEventListener('resize', updateMobileChatPosition);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateMobileChatPosition);
        window.visualViewport.removeEventListener('scroll', updateMobileChatPosition);
      } else {
        window.removeEventListener('resize', updateMobileChatPosition);
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
    if (!isConnected) return;
    applyRemoteStream();
    const videoElement = remoteVideoRef.current;
    if (videoElement) {
      const handler = () => applyRemoteStream();
      videoElement.addEventListener('loadedmetadata', handler);
      videoElement.addEventListener('loadeddata', handler);
      return () => {
        videoElement.removeEventListener('loadedmetadata', handler);
        videoElement.removeEventListener('loadeddata', handler);
      };
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
  }, []); // Only run on mount/unmount

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

      console.log('[ws] 🎯 matched with', data.partnerId, '- reconnections allowed, FIFO matching');

      if (!localStreamRef.current) {
        setError('Camera not ready. Please allow camera access.');
        return;
      }

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

    const handleFunRequest = (msg) => {
      setPendingFunRequest({ game: msg.game || 'chess' });
      setShowFunMenu(false);
      setShowPlayAlongSubmenu(false);
    };
    const handleFunAccept = (msg) => {
      const game = msg?.game || 'chess';
      setFunToken(1);
      setAcceptedFunGame(game);
      if (game === 'chess') {
        setAmIWhite(true);
        setChessState(createInitialState());
      }
      if (game === 'listen-along') {
        // Partner accepted our listen-along request; we are the host
        setIsMusicHost(true);
      }
      setShowFunMenu(false);
      setShowPlayAlongSubmenu(false);
    };
    const handleFunExit = () => {
      setFunToken(0);
      setAcceptedFunGame(null);
      setChessState(createInitialState());
      setIsMusicHost(false);
      setShowFunMenu(false);
      setShowPlayAlongSubmenu(false);
    };
    const handleFunReject = () => {
      setPendingFunRequest(null);
    };

    socketService.on('matched', handleMatch);
    socketService.on('fun-request', handleFunRequest);
    socketService.on('fun-accept', handleFunAccept);
    socketService.on('fun-reject', handleFunReject);
    socketService.on('fun-exit', handleFunExit);
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
      socketService.off('fun-request', handleFunRequest);
      socketService.off('fun-accept', handleFunAccept);
      socketService.off('fun-reject', handleFunReject);
      socketService.off('fun-exit', handleFunExit);
    };
  }, [isStarted]);

  const funGameLabel = { chess: 'Chess', 'truth-and-dare': 'Truth and Dare' }[pendingFunRequest?.game] || pendingFunRequest?.game || '';

  const isFunMode = funToken === 1 || !!acceptedFunGame;
  // On mobile, use the full-screen video layout by default (WhatsApp-style) whenever not in FUN mode.
  const isMobileFullscreen = !isFunMode;

  return (
    <VideoChatContainer>
      {pendingFunRequest && (
        <FunRequestOverlay>
          <FunRequestCard>
            <FunRequestText>
              Stranger wants to play <strong>{funGameLabel}</strong>. Accept or reject?
            </FunRequestText>
            <FunRequestActions>
              <StopButton
                onClick={() => {
                  socketService.send({ type: 'fun-reject' });
                  setPendingFunRequest(null);
                }}
                style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', border: 'none' }}
              >
                Reject
              </StopButton>
              <StartChatButton
                onClick={() => {
                  socketService.send({ type: 'fun-accept', game: pendingFunRequest.game });
                  setFunToken(1);
                  setAcceptedFunGame(pendingFunRequest.game);
                  if (pendingFunRequest.game === 'chess') {
                    setAmIWhite(false);
                    setChessState(createInitialState());
                  }
                  if (pendingFunRequest.game === 'listen-along') {
                    // We accepted partner's request; they are host, we are follower
                    setIsMusicHost(false);
                  }
                  setPendingFunRequest(null);
                }}
              >
                Accept
              </StartChatButton>
            </FunRequestActions>
          </FunRequestCard>
        </FunRequestOverlay>
      )}
      <Header 
        logo="Unitalks"
        hasSidebar={false}
      />
      
      <MainContent>
        <VideoSection $isFullScreenMobile={isMobileFullscreen}>
          <VideoFeedsContainer $isFullScreenMobile={isMobileFullscreen}>
            <VideoFeed $isFullScreenMobile={isMobileFullscreen} $isRemote>
              <VideoElement
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ visibility: isConnected ? 'visible' : 'hidden', transform: 'scaleX(-1)' }}
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
              <MobileVideoControls $hasSession={isStarted && !isFunMode}>
                {!isStarted ? (
                  <MobileControlButton
                    onClick={startNewChat}
                    className="start"
                    title="Start chat"
                  >
                    Start Chat
                  </MobileControlButton>
                ) : (!isFunMode && (
                  <>
                    <MobileControlButton
                      onClick={isWaiting && !isConnected ? cancelSearch : stopChat}
                      className="stop"
                      title={isWaiting && !isConnected ? "Cancel search" : "Stop chat"}
                    >
                      <FiSquare />
                    </MobileControlButton>
                    <FunMenuWrap ref={funMenuMobileRef}>
                      {funToken === 1 ? (
                        <MobileControlButton
                          onClick={exitFun}
                          className="fun"
                          title="Exit fun game"
                          style={{ borderColor: 'rgba(239,68,68,0.7)', background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                        >
                          EXIT FUN
                        </MobileControlButton>
                      ) : (
                        <>
                          <MobileControlButton
                            className="fun"
                            disabled={isWaiting && !isConnected}
                            onClick={() => {
                              if (isWaiting && !isConnected) return;
                              setShowFunMenu((v) => !v);
                            }}
                            title="Fun features"
                          >
                            <ButtonIcon><FiZap /></ButtonIcon>
                            Fun
                          </MobileControlButton>
                          {showFunMenu && (
                            <FunMenuPopover>
                              <FunMenuItem onClick={() => { setShowFunMenu(false); }}>
                                <FiVideo size={18} /> Watch Along
                              </FunMenuItem>
                              <FunMenuItem onClick={() => { socketService.send({ type: 'fun-request', game: 'listen-along' }); setShowFunMenu(false); }}>
                                <FiHeadphones size={18} /> Listen Along
                              </FunMenuItem>
                              <FunMenuItem>
                                <FiPlay size={18} /> Play Along
                              </FunMenuItem>
                              <FunSubmenu>
                                <FunMenuItem onClick={() => { socketService.send({ type: 'fun-request', game: 'chess' }); setShowFunMenu(false); }}>
                                  Chess
                                </FunMenuItem>
                                <FunMenuItem onClick={() => { socketService.send({ type: 'fun-request', game: 'truth-and-dare' }); setShowFunMenu(false); }}>
                                  Truth and Dare
                                </FunMenuItem>
                              </FunSubmenu>
                            </FunMenuPopover>
                          )}
                        </>
                      )}
                    </FunMenuWrap>
                    <MobileControlButton
                      onClick={skipPartner}
                      className="skip"
                      title="Skip to next stranger"
                      disabled={!isStarted || (isWaiting && !isConnected)}
                      style={{ opacity: isStarted && (!isWaiting || isConnected) ? 1 : 0.5, cursor: isStarted && (!isWaiting || isConnected) ? 'pointer' : 'not-allowed' }}
                    >
                      <FiSkipForward />
                    </MobileControlButton>
                  </>
                ))}
              </MobileVideoControls>
              <Watermark>
                <WatermarkLogo src="/assets/logos/logo.png" alt="UniTalks Logo" />
                <WatermarkText>UniTalks</WatermarkText>
              </Watermark>
            </VideoFeed>
            
                    <VideoFeed $isFullScreenMobile={isMobileFullscreen}>
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
                      {funToken === 1 && (
                        <FunMobileControls>
                          <FunMobileButton
                            className="danger"
                            onClick={isWaiting && !isConnected ? cancelSearch : stopChat}
                            title={isWaiting && !isConnected ? "Cancel search" : "Stop chat"}
                          >
                            <FiSquare />
                          </FunMobileButton>
                          <FunMobileButton
                            onClick={exitFun}
                            title="Exit fun game"
                          >
                            <FiZap />
                          </FunMobileButton>
                          <FunMobileButton
                            className="primary"
                            onClick={skipPartner}
                            title="Skip to next stranger"
                            disabled={!isStarted || (isWaiting && !isConnected)}
                          >
                            <FiSend />
                          </FunMobileButton>
                        </FunMobileControls>
                      )}
                    </VideoFeed>
          </VideoFeedsContainer>
                   <BottomControlsSection>
                     <ChatControls>
                      {!isStarted ? (
                        <ChatControlsStartRight>
                          <StartChatButton onClick={startNewChat} title="Start chat">
                            Start Chat
                          </StartChatButton>
                        </ChatControlsStartRight>
                      ) : (
                        <>
                          <FunMenuWrap ref={funMenuRef}>
                            {funToken === 1 ? (
                              <FunButton onClick={exitFun} title="Exit fun game" style={{ borderColor: 'rgba(239,68,68,0.7)', background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                                EXIT FUN
                              </FunButton>
                            ) : (
                              <>
                            <FunButton
                              disabled={isWaiting && !isConnected}
                              onClick={() => { if (!(isWaiting && !isConnected)) setShowFunMenu((v) => !v); }}
                              title="Fun features"
                            >
                              <ButtonIcon><FiZap /></ButtonIcon>
                              Fun
                            </FunButton>
                            {showFunMenu && (
                              <FunMenuPopover>
                                <FunMenuItem onClick={() => { setShowFunMenu(false); }}>
                                  <FiVideo size={18} /> Watch Along
                                </FunMenuItem>
                                <FunMenuItem onClick={() => { socketService.send({ type: 'fun-request', game: 'listen-along' }); setShowFunMenu(false); }}>
                                  <FiHeadphones size={18} /> Listen Along
                                </FunMenuItem>
                                <FunMenuItem>
                                  <FiPlay size={18} /> Play Along
                                </FunMenuItem>
                                <FunSubmenu>
                                  <FunMenuItem onClick={() => { socketService.send({ type: 'fun-request', game: 'chess' }); setShowFunMenu(false); }}>
                                    Chess
                                  </FunMenuItem>
                                  <FunMenuItem onClick={() => { socketService.send({ type: 'fun-request', game: 'truth-and-dare' }); setShowFunMenu(false); }}>
                                    Truth and Dare
                                  </FunMenuItem>
                                </FunSubmenu>
                              </FunMenuPopover>
                            )}
                              </>
                            )}
                          </FunMenuWrap>
                          <ChatControlsRight>
                            <StopButton
                              onClick={isWaiting && !isConnected ? cancelSearch : stopChat}
                              title={isWaiting && !isConnected ? "Cancel search" : "Stop chat"}
                            >
                              Stop
                            </StopButton>
                            <SkipButton
                              onClick={skipPartner}
                              title="Skip to next stranger"
                              disabled={!isStarted || (isWaiting && !isConnected)}
                            >
                              Skip
                            </SkipButton>
                          </ChatControlsRight>
                        </>
                      )}
                     </ChatControls>
                   </BottomControlsSection>
          
          <ChatSection $isFullScreenMobile={isMobileFullscreen}>
            <ChatHeader>
              <Logo>
                <div>
                  <BrandText>Live Chat</BrandText>
                  <InterestText style={{ display: 'block' }}>
                    {isConnected
                      ? 'Anonymous · nothing is stored'
                      : isWaiting
                        ? 'Looking for a stranger…'
                        : 'Start a chat to begin'}
                  </InterestText>
                </div>
              </Logo>
              <StatusMessage>
                {isConnected ? 'Live' : isWaiting ? 'Searching' : 'Idle'}
              </StatusMessage>
            </ChatHeader>
            {error && !error.includes('already in session') && !error.includes('Already searching') && <ErrorMessage>{error}</ErrorMessage>}
            {(acceptedFunGame === 'chess' || acceptedFunGame === 'listen-along') && (
              <ChessArea>
                {acceptedFunGame === 'chess' && (
                  <ChessBoard
                    state={chessState}
                    amIWhite={amIWhite}
                    onMove={handleChessMove}
                    disabled={!!chessState.gameOver || (chessState.turn === 'white' && !amIWhite) || (chessState.turn === 'black' && amIWhite)}
                  />
                )}
                {acceptedFunGame === 'listen-along' && (
                  <MusicPlayerContainer>
                    {isMusicHost && (
                      <MusicSearchSection>
                        <MusicTrackInput
                          type="text"
                          placeholder="Search songs on JioSaavn..."
                          value={saavnQuery}
                          onChange={(e) => setSaavnQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') loadSaavnTrack(); }}
                          disabled={isLoadingTrack}
                        />
                        <MusicStatusText>
                          {isLoadingTrack ? 'Loading track…' : 'Press Enter to search and play'}
                        </MusicStatusText>
                      </MusicSearchSection>
                    )}
                    {!isMusicHost && (
                      <MusicStatusText>
                        Your partner is controlling the music. You are listening along.
                      </MusicStatusText>
                    )}
                    {musicTrackTitle && (
                      <MusicPlayerMain>
                        <MusicArtworkSection>
                          {musicTrackArtwork && (
                            <MusicArtwork src={musicTrackArtwork} alt={musicTrackTitle} />
                          )}
                          <MusicInfoSection>
                            <MusicTitle>{musicTrackTitle}</MusicTitle>
                            <MusicArtist>{musicTrackArtist || 'Unknown Artist'}</MusicArtist>
                            {musicTrackDuration > 0 && (
                              <MusicDurationText>Duration: {formatDuration(musicTrackDuration)}</MusicDurationText>
                            )}
                          </MusicInfoSection>
                        </MusicArtworkSection>
                        <MusicProgressSection>
                          <MusicEqualizer>
                            <MusicEqualizerBar $isPlaying={musicIsPlaying} $delay={0} />
                            <MusicEqualizerBar $isPlaying={musicIsPlaying} $delay={120} />
                            <MusicEqualizerBar $isPlaying={musicIsPlaying} $delay={240} />
                            <MusicEqualizerBar $isPlaying={musicIsPlaying} $delay={360} />
                            <MusicEqualizerBar $isPlaying={musicIsPlaying} $delay={480} />
                          </MusicEqualizer>
                          <MusicProgressRow>
                            <MusicTimeText>{formatDuration(musicPosition)}</MusicTimeText>
                            <MusicProgressInput
                              type="range"
                              min={0}
                              max={musicDuration || musicTrackDuration || 0}
                              step={0.5}
                              value={Math.max(0, Math.min(musicPosition, musicDuration || musicTrackDuration || 0))}
                              onChange={(e) => {
                                const nextPos = parseFloat(e.target.value) || 0;
                                setMusicPosition(nextPos);
                              }}
                              onMouseUp={(e) => {
                                const nextPos = parseFloat(e.target.value) || 0;
                                if (!musicTrackUrl) return;
                                applyMusicStateToAudio(musicTrackUrl, musicIsPlaying, nextPos);
                                sendMusicControl({
                                  action: 'seek',
                                  trackUrl: musicTrackUrl,
                                  position: nextPos,
                                });
                              }}
                              onTouchEnd={(e) => {
                                const target = e.target;
                                const nextPos = parseFloat(target.value) || 0;
                                if (!musicTrackUrl) return;
                                applyMusicStateToAudio(musicTrackUrl, musicIsPlaying, nextPos);
                                sendMusicControl({
                                  action: 'seek',
                                  trackUrl: musicTrackUrl,
                                  position: nextPos,
                                });
                              }}
                            />
                            <MusicTimeText>{formatDuration(musicDuration || musicTrackDuration || 0)}</MusicTimeText>
                          </MusicProgressRow>
                        </MusicProgressSection>
                        <MusicControlsRow>
                          <MusicControlButton
                            disabled={!musicTrackUrl}
                            onClick={() => {
                              const audio = musicAudioRef.current;
                              if (!audio) return;
                              const nextPos = Math.max(0, audio.currentTime - 10);
                              setMusicPosition(nextPos);
                              applyMusicStateToAudio(musicTrackUrl, musicIsPlaying, nextPos);
                              sendMusicControl({
                                action: 'seek',
                                trackUrl: musicTrackUrl,
                                position: nextPos,
                              });
                            }}
                            title="Rewind 10s"
                          >
                            <FiSkipBack />
                          </MusicControlButton>
                          {musicIsPlaying ? (
                            <MusicControlButton
                              className="play-pause"
                              disabled={!musicTrackUrl}
                              onClick={() => {
                                const audio = musicAudioRef.current;
                                const current = audio ? audio.currentTime : 0;
                                setMusicIsPlaying(false);
                                setMusicPosition(current);
                                applyMusicStateToAudio(musicTrackUrl, false, current);
                                sendMusicControl({
                                  action: 'pause',
                                  trackUrl: musicTrackUrl,
                                  position: current,
                                });
                              }}
                              title="Pause"
                            >
                              <FiSquare />
                            </MusicControlButton>
                          ) : (
                            <MusicControlButton
                              className="play-pause"
                              disabled={!musicTrackUrl}
                              onClick={() => {
                                if (!musicTrackUrl) return;
                                const audio = musicAudioRef.current;
                                const current = audio ? audio.currentTime : 0;
                                setMusicIsPlaying(true);
                                setMusicPosition(current);
                                applyMusicStateToAudio(musicTrackUrl, true, current);
                                sendMusicControl({
                                  action: 'play',
                                  trackUrl: musicTrackUrl,
                                  position: current,
                                });
                              }}
                              title="Play"
                            >
                              <FiPlay />
                            </MusicControlButton>
                          )}
                          <MusicControlButton
                            disabled={!musicTrackUrl}
                            onClick={() => {
                              const audio = musicAudioRef.current;
                              if (!audio) return;
                              const nextPos = Math.min(audio.duration || audio.currentTime + 10, audio.currentTime + 10);
                              setMusicPosition(nextPos);
                              applyMusicStateToAudio(musicTrackUrl, musicIsPlaying, nextPos);
                              sendMusicControl({
                                action: 'seek',
                                trackUrl: musicTrackUrl,
                                position: nextPos,
                              });
                            }}
                            title="Forward 10s"
                          >
                            <FiSkipForward />
                          </MusicControlButton>
                        </MusicControlsRow>
                        {musicTrackLyrics && (
                          <MusicLyricsSection>
                            <MusicLyricsText>{musicTrackLyrics}</MusicLyricsText>
                          </MusicLyricsSection>
                        )}
                      </MusicPlayerMain>
                    )}
                    <audio ref={musicAudioRef} style={{ display: 'none' }} />
                  </MusicPlayerContainer>
                )}
              </ChessArea>
            )}
                   {funToken !== 1 && (
                   <ChatBox $keyboardHeight={keyboardHeight} $mobileChatTop={mobileChatTop} $chessMode={acceptedFunGame === 'chess'}>
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
                   )}
             
          </ChatSection>
        </VideoSection>
      </MainContent>
      
    </VideoChatContainer>
  );
}

export default VideoChat;
