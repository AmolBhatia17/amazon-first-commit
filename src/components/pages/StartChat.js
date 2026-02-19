import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { FiMessageCircle, FiMic, FiVideo, FiArrowRight } from 'react-icons/fi';
import Header from '../layout/Header';

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(29,185,84,0.25), 0 0 40px rgba(29,185,84,0.1); }
  50% { box-shadow: 0 0 30px rgba(29,185,84,0.4), 0 0 60px rgba(29,185,84,0.15); }
`;

const StartChatContainer = styled.div`
  min-height: 100vh;
  max-width: 100vw;
  background: #000;
  color: #F8FAFC;
  overflow-x: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 40px 20px 40px;
  margin-top: 70px;
  position: relative;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(60% 80% at 50% 20%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%),
      radial-gradient(600px 300px at 50% 10%, rgba(29,185,84,0.12), rgba(0,0,0,0) 60%);
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    margin-top: 0;
    padding: 30px 16px 30px;
  }
`;

const TitleBlock = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 640px;
  margin-bottom: 1.25rem;
  text-align: center;

  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const TaglinePill = styled.div`
  display: inline-block;
  background: rgba(29,185,84,0.2);
  border: 1px solid rgba(29,185,84,0.5);
  color: #1DB954;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 6px 14px;
  border-radius: 999px;
  margin-bottom: 1rem;
  text-transform: uppercase;
`;

const CardTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 900;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const TitleGreen = styled.span`
  color: #1DB954;
`;

const TitleHighlight = styled.span`
  color: #1DB954;
  background: rgba(29,185,84,0.15);
  padding: 0 6px;
  border-radius: 6px;
`;

const CardSub = styled.p`
  color: rgba(255,255,255,0.7);
  font-size: 1rem;
  margin: 0 0 1.25rem 0;
  line-height: 1.6;
`;

const OptionsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  max-width: 900px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const ChatOption = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #F8FAFC;
  background: linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(8,8,8,0.98) 100%);
  border: 1px solid rgba(29,185,84,0.4);
  border-radius: 20px;
  padding: 2rem 1.5rem;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  animation: ${glow} 4s ease-in-out infinite;
  backdrop-filter: blur(12px);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(100% 100% at 50% 0%, rgba(29,185,84,0.12), transparent 70%);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    border-color: rgba(29,185,84,0.75);
    transform: translateY(-5px);
    box-shadow: 0 16px 48px rgba(29,185,84,0.25), 0 0 0 1px rgba(29,185,84,0.4);
    &::before { opacity: 1; }
  }

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    gap: 1.25rem;
    padding: 1.5rem 1.5rem;
  }
`;

const IconWrap = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: radial-gradient(100% 100% at 50% 0%, rgba(29,185,84,0.5), rgba(0,0,0,0.9));
  border: 1px solid rgba(29,185,84,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: #E5E7EB;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 20px rgba(29,185,84,0.15);

  svg { width: 28px; height: 28px; }

  @media (max-width: 768px) {
    width: 52px;
    height: 52px;
    margin-bottom: 0;
    flex-shrink: 0;
    svg { width: 24px; height: 24px; }
  }
`;

const CardTextWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  @media (max-width: 768px) {
    align-items: flex-start;
  }
`;

const OptionLabel = styled.span`
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 1.05rem;
  }
`;

const OptionDesc = styled.span`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.6);
  margin-top: 0.35rem;
  line-height: 1.4;
  max-width: 140px;
  text-align: center;

  @media (max-width: 768px) {
    text-align: left;
    max-width: none;
    margin-top: 0.2rem;
  }
`;

const ArrowWrap = styled.span`
  color: #1DB954;
  font-size: 1.25rem;
  margin-top: 0.75rem;
  transition: transform 0.2s ease;
  position: relative;
  z-index: 1;

  ${ChatOption}:hover & {
    transform: translateX(4px);
  }

  @media (max-width: 768px) {
    margin-top: 0;
    margin-left: auto;
  }
`;

function StartChat() {

  return (
    <StartChatContainer>
      <Header logo="Unitalks" hasSidebar={false} />
      <MainContent>
        <TitleBlock>
          <TaglinePill>TEXT • VOICE • VIDEO</TaglinePill>
          <CardTitle>
            <TitleGreen>Lights on.</TitleGreen>{' '}
            <TitleHighlight>Chat</TitleHighlight> reimagined.
          </CardTitle>
          <CardSub>
            Minimal UI, maximal energy. Meet new minds instantly — in a slick green world.
          </CardSub>
        </TitleBlock>
        <OptionsRow>
          <ChatOption to="/video">
            <IconWrap><FiVideo /></IconWrap>
            <CardTextWrap>
              <OptionLabel>Video Chat</OptionLabel>
              <OptionDesc>Face-to-face. Minimal UI, maximal vibe.</OptionDesc>
            </CardTextWrap>
            <ArrowWrap><FiArrowRight /></ArrowWrap>
          </ChatOption>
          <ChatOption to="/text">
            <IconWrap><FiMessageCircle /></IconWrap>
            <CardTextWrap>
              <OptionLabel>Text Chat</OptionLabel>
              <OptionDesc>Fast bubbles, clean layout. Say more with less.</OptionDesc>
            </CardTextWrap>
            <ArrowWrap><FiArrowRight /></ArrowWrap>
          </ChatOption>
          <ChatOption to="/voice">
            <IconWrap><FiMic /></IconWrap>
            <CardTextWrap>
              <OptionLabel>Voice Chat</OptionLabel>
              <OptionDesc>Crystal-clear audio. Low latency, high energy.</OptionDesc>
            </CardTextWrap>
            <ArrowWrap><FiArrowRight /></ArrowWrap>
          </ChatOption>
        </OptionsRow>
      </MainContent>
    </StartChatContainer>
  );
}

export default StartChat;
