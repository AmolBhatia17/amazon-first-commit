import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import {
  FiMessageSquare, FiMic, FiVideo, FiArrowRight, FiZap,
  FiEyeOff, FiRefreshCw, FiShield,
} from 'react-icons/fi';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

/* ── Layout ─────────────────────────────────────────────────────────── */

const Page = styled.div`
  width: 100%;
  min-height: 100vh;
  padding-top: 72px;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) { padding-top: 60px; }
`;

const Section = styled.section`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;

  @media (max-width: 768px) { padding: 0 16px; }
`;

/* ── Hero ───────────────────────────────────────────────────────────── */

const Hero = styled(Section)`
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 48px;
  align-items: center;
  padding-top: 40px;
  padding-bottom: 56px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 32px;
    padding-top: 28px;
    padding-bottom: 36px;
  }
`;

const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const KickerPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  box-shadow: 0 2px 0 ${({ theme }) => theme.colors.ink};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 24px;
`;

const Headline = styled.h1`
  font-size: 54px;
  line-height: 1.06;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 20px;

  @media (max-width: 980px) { font-size: 42px; }
  @media (max-width: 560px) { font-size: 34px; }
`;

/* Hand-drawn marker swipe under a word — the signature landing detail */
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
    border-radius: 999px 999px 999px 999px / 8px;
    transform: rotate(-1deg);
    z-index: 0;
  }
`;

const Sub = styled.p`
  font-size: 17px;
  line-height: 1.5;
  font-weight: 500;
  color: rgba(28, 28, 30, 0.72);
  max-width: 560px;
  margin: 0 0 28px;

  @media (max-width: 560px) { font-size: 15px; }
`;

const CTAGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  width: 100%;
`;

const PrimaryLink = styled(Link)`
  height: 54px;
  padding: 0 28px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 0 rgba(28, 28, 30, 0.35);
  transition: transform 0.15s ease;

  &:hover { transform: translateY(-2px); }
  &:active { transform: translateY(0) scale(0.98); }

  @media (max-width: 560px) { width: 100%; }
`;

const GhostLink = styled(Link)`
  height: 54px;
  padding: 0 22px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  box-shadow: 0 4px 0 ${({ theme }) => theme.colors.ink};
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover { background: ${({ theme }) => theme.colors.paperAlt}; transform: translateY(-2px); }
  &:active { transform: translateY(0) scale(0.98); }

  svg { color: ${({ theme }) => theme.colors.blue}; }

  @media (max-width: 560px) { width: 100%; }
`;

/* ── Hero visual: tilted bubble stack ───────────────────────────────── */

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
`;

const HeroVisual = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 26px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 6px 0 ${({ theme }) => theme.colors.ink};

  @media (max-width: 980px) { display: none; }
`;

const Bubble = styled.div`
  position: relative;
  align-self: ${({ $own }) => ($own ? 'flex-end' : 'flex-start')};
  max-width: 86%;
  padding: 13px 16px;
  border-radius: ${({ theme }) => theme.radii.bubble};
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  transform: rotate(${({ $tilt }) => $tilt || '0deg'});
  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay || '0s'};

  background: ${({ theme, $variant }) =>
    $variant === 'blue' ? theme.colors.blue
    : $variant === 'orange' ? theme.colors.orange
    : $variant === 'sun' ? theme.colors.sun
    : theme.colors.paper};
  color: ${({ theme, $variant }) =>
    $variant === 'blue' ? theme.colors.paper : theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-bottom-${({ $own }) => ($own ? 'right' : 'left')}-radius: 4px;
`;

const BubbleMeta = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.62;
  margin-bottom: 5px;
`;

const BadgePin = styled.span`
  position: absolute;
  top: -9px;
  ${({ $own }) => ($own ? 'left: -9px;' : 'right: -9px;')}
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: ${({ theme, $color }) => $color || theme.colors.blue};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
`;

/* ── Marquee ticker ─────────────────────────────────────────────────── */

const scroll = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
`;

const TickerContainer = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.ink};
  border-top: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.ink};
  overflow: hidden;
  padding: 14px 0;
  margin: 8px 0 48px;

  &:hover > div { animation-play-state: paused; }
`;

const TickerTrack = styled.div`
  display: flex;
  width: max-content;
  animation: ${scroll} 32s linear infinite;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const TickerItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px;
  color: ${({ theme }) => theme.colors.paper};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const Dot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.sun};
`;

/* ── Section heading ────────────────────────────────────────────────── */

const SectionHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; gap: 10px; }
`;

const SmallPill = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 12px;
`;

const SectionTitle = styled.h2`
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0;

  @media (max-width: 560px) { font-size: 26px; }
`;

const SectionNote = styled.p`
  font-size: 15px;
  font-weight: 500;
  color: rgba(28, 28, 30, 0.65);
  max-width: 420px;
  margin: 0;
`;

/* ── Feature cards ──────────────────────────────────────────────────── */

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 48px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Card = styled(Link)`
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 24px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 4px 0 ${({ theme }) => theme.colors.ink};

  &:hover { transform: translateY(-3px); box-shadow: 0 7px 0 ${({ theme }) => theme.colors.ink}; }
  &:active { transform: translateY(0) scale(0.99); }
`;

const IconTile = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: ${({ $bg }) => $bg};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  color: ${({ $fg, theme }) => $fg || theme.colors.ink};
  margin-bottom: 18px;
`;

const CardTag = styled.span`
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paperAlt};
  border: 1px solid ${({ theme }) => theme.colors.line};
  font-size: 11px;
  font-weight: 700;
  color: rgba(28, 28, 30, 0.7);
  margin-bottom: 10px;
`;

const CardTitle = styled.h3`
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 8px;
`;

const CardText = styled.p`
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(28, 28, 30, 0.66);
  margin: 0 0 20px;
  flex: 1;
`;

const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`;

const CardFootText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ink};
`;

const ArrowButton = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

/* ── Safety ─────────────────────────────────────────────────────────── */

const SafetyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 48px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const SafetyCard = styled.div`
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 20px;
  display: flex;
  gap: 14px;
`;

const SafetyIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
`;

const SafetyTitle = styled.h4`
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 2px 0 6px;
`;

const SafetyText = styled.p`
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(28, 28, 30, 0.62);
  margin: 0;
`;

/* ── Closing CTA slab ───────────────────────────────────────────────── */

const CTASlab = styled.div`
  background: ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 8px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 28px 22px;
  }
`;

const SlabTitle = styled.h2`
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.paper};
  margin: 14px 0 0;

  @media (max-width: 560px) { font-size: 27px; }
`;

const SlabPill = styled.span`
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.sun};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SlabActions = styled.div`
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: 560px) { width: 100%; }
`;

const SlabPrimary = styled(Link)`
  height: 52px;
  padding: 0 24px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.sun};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover { background: ${({ theme }) => theme.colors.ink}; }
  &:active { transform: scale(0.98); }

  @media (max-width: 560px) { width: 100%; }
`;

const SlabGhost = styled(Link)`
  height: 52px;
  padding: 0 24px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: transparent;
  color: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid rgba(255, 255, 255, 0.45);
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover { background: rgba(255, 255, 255, 0.1); }
  &:active { transform: scale(0.98); }

  @media (max-width: 560px) { width: 100%; }
`;

const tickerItems = [
  'Anonymous by default', 'No signup', 'Nothing stored', 'Text · Voice · Video',
  'Peer-to-peer', 'Skip anytime', 'Free forever',
];

function Homepage() {
  return (
    <Page>
      <Header />

      <Hero>
        <HeroCopy>
          <KickerPill>✨ 100% Anonymous Campus Chat</KickerPill>
          <Headline>
            Meet college <Marked><span>strangers</span></Marked> who get your wavelength.
          </Headline>
          <Sub>
            Skip the small talk and meet students across India in 1-on-1 text, voice or video.
            No accounts, no logs, totally anonymous.
          </Sub>
          <CTAGroup>
            <PrimaryLink to="/start-chat">
              Start Chatting Now <FiArrowRight />
            </PrimaryLink>
            <GhostLink to="/video">
              <FiZap /> Try Video Chat
            </GhostLink>
          </CTAGroup>
        </HeroCopy>

        <HeroVisual>
          <Bubble $tilt="-1deg" $delay="0s">
            <BadgePin><FiMessageSquare /></BadgePin>
            <BubbleMeta>Stranger</BubbleMeta>
            Anyone pulling an all-nighter for finals? Need peer pressure to stay awake ☕
          </Bubble>
          <Bubble $variant="sun" $tilt="1deg" $delay="0.6s">
            Currently surviving on 2am Maggi and pure academic panic 🍜
          </Bubble>
          <Bubble $own $variant="blue" $tilt="-1deg" $delay="1.2s">
            <BadgePin $own $color="#F59033"><FiZap /></BadgePin>
            Haha match found! Let's swap study playlists before the brain melts 🎧
          </Bubble>
          <Bubble $own $variant="orange" $tilt="1deg" $delay="1.8s">
            <BubbleMeta>Voice ready</BubbleMeta>
            Audio room connected • 00:42
          </Bubble>
        </HeroVisual>
      </Hero>

      <TickerContainer>
        <TickerTrack>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <TickerItem key={i}><Dot />{item}</TickerItem>
          ))}
        </TickerTrack>
      </TickerContainer>

      <Section>
        <SectionHead>
          <div>
            <SmallPill>Three ways to connect</SmallPill>
            <SectionTitle>Pick how you want to talk</SectionTitle>
          </div>
          <SectionNote>
            Zero login barriers. Choose your mode and get matched with another student in seconds.
          </SectionNote>
        </SectionHead>

        <FeatureGrid>
          <Card to="/text">
            <IconTile $bg="#F9C74A"><FiMessageSquare /></IconTile>
            <CardTag>Fastest · Low bandwidth</CardTag>
            <CardTitle>Text Chat</CardTitle>
            <CardText>
              Casual banter, hostel confessions, exam tips and late-night rants — with complete anonymity.
            </CardText>
            <CardFoot>
              <CardFootText>Hop in instantly</CardFootText>
              <ArrowButton><FiArrowRight /></ArrowButton>
            </CardFoot>
          </Card>

          <Card to="/voice">
            <IconTile $bg="#2D7FF9" $fg="#FFFFFF"><FiMic /></IconTile>
            <CardTag>Crystal audio · Low lag</CardTag>
            <CardTitle>Voice Chat</CardTitle>
            <CardText>
              Late-night chill calls and unfiltered audio conversations, without exchanging numbers or handles.
            </CardText>
            <CardFoot>
              <CardFootText>Start speaking</CardFootText>
              <ArrowButton><FiArrowRight /></ArrowButton>
            </CardFoot>
          </Card>

          <Card to="/video">
            <IconTile $bg="#F59033"><FiVideo /></IconTile>
            <CardTag>Face to face</CardTag>
            <CardTitle>Video Chat</CardTitle>
            <CardText>
              Instant face-to-face random matches, peer-to-peer, with a one-tap skip whenever you want out.
            </CardText>
            <CardFoot>
              <CardFootText>Go live</CardFootText>
              <ArrowButton><FiArrowRight /></ArrowButton>
            </CardFoot>
          </Card>
        </FeatureGrid>

        <SectionHead>
          <div>
            <SmallPill>Peace of mind first</SmallPill>
            <SectionTitle>Built to stay anonymous</SectionTitle>
          </div>
        </SectionHead>

        <SafetyGrid>
          <SafetyCard>
            <SafetyIcon $bg="#FDE9AE"><FiEyeOff /></SafetyIcon>
            <div>
              <SafetyTitle>Strictly anonymous</SafetyTitle>
              <SafetyText>
                No phone numbers, no social handles, no profiles. You are always just a fellow student.
              </SafetyText>
            </div>
          </SafetyCard>

          <SafetyCard>
            <SafetyIcon $bg="#7FB2F7"><FiRefreshCw /></SafetyIcon>
            <div>
              <SafetyTitle>Nothing stored</SafetyTitle>
              <SafetyText>
                Chats run peer-to-peer over WebRTC. When you disconnect or skip, the conversation is gone.
              </SafetyText>
            </div>
          </SafetyCard>

          <SafetyCard>
            <SafetyIcon $bg="#FF3B30"><FiShield /></SafetyIcon>
            <div>
              <SafetyTitle>Skip anytime</SafetyTitle>
              <SafetyText>
                One tap moves you to the next student. No explanation needed, no history kept.
              </SafetyText>
            </div>
          </SafetyCard>
        </SafetyGrid>

        <CTASlab>
          <div>
            <SlabPill>No registration needed</SlabPill>
            <SlabTitle>
              Bored in your dorm?<br />Find a match in seconds.
            </SlabTitle>
          </div>
          <SlabActions>
            <SlabPrimary to="/text">Start Text Chat</SlabPrimary>
            <SlabGhost to="/voice">Open Voice Room</SlabGhost>
          </SlabActions>
        </CTASlab>
      </Section>

      <Footer />
    </Page>
  );
}

export default Homepage;
