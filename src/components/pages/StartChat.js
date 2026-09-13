import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import {
  FiMessageSquare, FiMic, FiVideo, FiArrowRight, FiZap, FiCheck,
  FiLock, FiShield, FiSlash,
} from 'react-icons/fi';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const Page = styled.div`
  width: 100%;
  min-height: 100vh;
  padding-top: 72px;
  display: flex;
  flex-direction: column;
  position: relative;

  @media (max-width: 768px) { padding-top: 60px; }
`;

const Main = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 44px 24px 8px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) { padding: 28px 16px 8px; }
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 36px;
`;

const TaglinePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  box-shadow: 0 2px 0 ${({ theme }) => theme.colors.ink};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 22px;
`;

const CardTitle = styled.h1`
  font-size: 50px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 16px;
  max-width: 760px;

  @media (max-width: 900px) { font-size: 38px; }
  @media (max-width: 560px) { font-size: 30px; }
`;

const Marked = styled.span`
  position: relative;
  display: inline-block;
  white-space: nowrap;

  span { position: relative; z-index: 1; }

  &::after {
    content: '';
    position: absolute;
    left: -2px;
    right: -2px;
    bottom: -3px;
    height: 9px;
    background: ${({ theme }) => theme.colors.ink};
    border-radius: 999px / 8px;
    transform: rotate(-1deg);
    z-index: 0;
  }
`;

const CardSub = styled.p`
  font-size: 17px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(28, 28, 30, 0.68);
  max-width: 620px;
  margin: 0;

  @media (max-width: 560px) { font-size: 15px; }
`;

const OptionsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const ChatOption = styled(Link)`
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 26px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 0 ${({ theme }) => theme.colors.ink};
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover { transform: translateY(-3px); box-shadow: 0 8px 0 ${({ theme }) => theme.colors.ink}; }
  &:active { transform: translateY(0) scale(0.99); box-shadow: 0 3px 0 ${({ theme }) => theme.colors.ink}; }

  @media (max-width: 900px) { padding: 20px; }
`;

const OptionTag = styled.span`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ $bg, theme }) => $bg || theme.colors.paperAlt};
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 20px;
`;

const IconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${({ $bg }) => $bg};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  color: ${({ $fg, theme }) => $fg || theme.colors.ink};
  margin-bottom: 18px;
`;

const OptionLabel = styled.h2`
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.028em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 10px;
`;

const OptionDesc = styled.p`
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(28, 28, 30, 0.66);
  margin: 0 0 18px;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ink};

  svg { color: ${({ theme }) => theme.colors.blue}; flex-shrink: 0; }
`;

const OptionFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`;

const OptionFootText = styled.span`
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ink};
`;

const ArrowWrap = styled.span`
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
`;

const AssuranceBar = styled.div`
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 34px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
`;

const AssuranceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ink};

  svg { flex-shrink: 0; }
`;

function StartChat() {
  return (
    <Page>
      <Header />

      <Main>
        <TitleBlock>
          <TaglinePill><FiZap /> Step 1 of 1 — pick your vibe</TaglinePill>
          <CardTitle>
            Choose how you want to <Marked><span>connect</span></Marked> tonight.
          </CardTitle>
          <CardSub>
            Skip the small talk. Anonymous, instant pairing with other college students — no
            account, no phone number, nothing saved.
          </CardSub>
        </TitleBlock>

        <OptionsRow>
          <ChatOption to="/text">
            <OptionTag $bg="#FDE9AE"><FiZap /> Fastest · Low bandwidth</OptionTag>
            <IconWrap $bg="#F9C74A"><FiMessageSquare /></IconWrap>
            <OptionLabel>Text Chat</OptionLabel>
            <OptionDesc>
              Casual hostel banter, exam rants and late-night study panic. Zero setup, instant matches.
            </OptionDesc>
            <FeatureList>
              <FeatureItem><FiCheck /> No microphone or camera needed</FeatureItem>
              <FeatureItem><FiCheck /> Reply to any message</FeatureItem>
              <FeatureItem><FiCheck /> Works on slow connections</FeatureItem>
            </FeatureList>
            <OptionFoot>
              <OptionFootText>Enter text lounge</OptionFootText>
              <ArrowWrap><FiArrowRight /></ArrowWrap>
            </OptionFoot>
          </ChatOption>

          <ChatOption to="/voice">
            <OptionTag $bg="#DCE9FE"><FiMic /> Crystal audio · Zero video</OptionTag>
            <IconWrap $bg="#2D7FF9" $fg="#FFFFFF"><FiMic /></IconWrap>
            <OptionLabel>Voice Chat</OptionLabel>
            <OptionDesc>
              Late-night call vibes without sharing numbers or social handles. Pure, candid conversation.
            </OptionDesc>
            <FeatureList>
              <FeatureItem><FiCheck /> Live voice visualizer</FeatureItem>
              <FeatureItem><FiCheck /> Listen Along music sync</FeatureItem>
              <FeatureItem><FiCheck /> Skip to a new match anytime</FeatureItem>
            </FeatureList>
            <OptionFoot>
              <OptionFootText>Join voice room</OptionFootText>
              <ArrowWrap><FiArrowRight /></ArrowWrap>
            </OptionFoot>
          </ChatOption>

          <ChatOption to="/video">
            <OptionTag $bg="#FDD9B5"><FiVideo /> Face to face</OptionTag>
            <IconWrap $bg="#F59033"><FiVideo /></IconWrap>
            <OptionLabel>Video Chat</OptionLabel>
            <OptionDesc>
              Spontaneous webcam pairing with another student, streamed directly peer-to-peer.
            </OptionDesc>
            <FeatureList>
              <FeatureItem><FiCheck /> Peer-to-peer stream</FeatureItem>
              <FeatureItem><FiCheck /> Side-by-side live chat</FeatureItem>
              <FeatureItem><FiCheck /> Chess &amp; icebreaker games</FeatureItem>
            </FeatureList>
            <OptionFoot>
              <OptionFootText>Start camera lobby</OptionFootText>
              <ArrowWrap><FiArrowRight /></ArrowWrap>
            </OptionFoot>
          </ChatOption>
        </OptionsRow>

        <AssuranceBar>
          <AssuranceItem><FiLock /> No logs kept</AssuranceItem>
          <AssuranceItem><FiShield /> Peer-to-peer WebRTC, encrypted in transit</AssuranceItem>
          <AssuranceItem><FiSlash /> No real name or phone number needed</AssuranceItem>
        </AssuranceBar>
      </Main>

      <Footer />
    </Page>
  );
}

export default StartChat;
