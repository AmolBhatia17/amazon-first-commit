import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

import * as CP from '../ui/ContentPage';

/* Amber Paper content-page kit (see ../ui/ContentPage). */
const AboutContainer = CP.Shell;
const AboutContent = CP.Wrap;
const HeroSection = CP.Section;
const AboutTitle = CP.Title;
const Subtitle = CP.Subtitle;
const FeaturesGrid = CP.Grid;
const FeatureCard = CP.GridCard;
const FeatureIcon = CP.IconTile;
const FeatureTitle = CP.CardTitle;
const FeatureDescription = CP.CardText;
const Section = CP.Section;
const SectionTitle = CP.SectionTitle;
const PrivacySection = CP.Card;
const PrivacyTitle = CP.SectionTitle;
const PrivacyContent = CP.Grid;
const PrivacyItem = CP.GridCard;
const PrivacyIcon = CP.IconTile;
const PrivacyItemTitle = CP.CardTitle;
const PrivacyItemText = CP.CardText;
const MissionSection = CP.Card;
const MissionTitle = CP.SectionTitle;
const MissionText = CP.Paragraph;
const StatsSection = CP.Grid;
const StatCard = CP.StatCard;
const StatNumber = CP.StatNumber;
const StatLabel = CP.StatLabel;

function About() {
  return (
    <AboutContainer>
      <Header 
        logo="Unitalks"
        hasSidebar={false}
      />
      
      <AboutContent>
        <HeroSection>
          <AboutTitle>About Unitalks</AboutTitle>
          <Subtitle>
            Connecting people worldwide through secure, anonymous, and real-time communication
          </Subtitle>
        </HeroSection>

        <FeaturesGrid>
          <FeatureCard>
            <FeatureIcon>💬</FeatureIcon>
            <FeatureTitle>Text Chat</FeatureTitle>
            <FeatureDescription>
              Connect with random users through instant text messaging. Share thoughts, ideas, and conversations in real-time with complete anonymity.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🎤</FeatureIcon>
            <FeatureTitle>Voice Calls</FeatureTitle>
            <FeatureDescription>
              Experience crystal-clear voice conversations with users around the world. Our high-quality audio ensures smooth communication.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📹</FeatureIcon>
            <FeatureTitle>Video Calls</FeatureTitle>
            <FeatureDescription>
              Face-to-face conversations with HD video quality. Connect visually with people globally while maintaining your privacy.
            </FeatureDescription>
          </FeatureCard>
        </FeaturesGrid>

        <Section>
          <SectionTitle>Our Privacy Commitment</SectionTitle>
          <PrivacySection>
            <PrivacyTitle>Your Privacy is Our Priority</PrivacyTitle>
            <PrivacyContent>
              <PrivacyItem>
                <PrivacyIcon>🔒</PrivacyIcon>
                <PrivacyItemTitle>No Data Storage</PrivacyItemTitle>
                <PrivacyItemText>
                  We don't store any personal information, chat logs, or user data. Your conversations remain private and temporary.
                </PrivacyItemText>
              </PrivacyItem>

              <PrivacyItem>
                <PrivacyIcon>👤</PrivacyIcon>
                <PrivacyItemTitle>Anonymous Usage</PrivacyItemTitle>
                <PrivacyItemText>
                  No registration required. Use our platform completely anonymously without creating any accounts.
                </PrivacyItemText>
              </PrivacyItem>

              <PrivacyItem>
                <PrivacyIcon>🛡️</PrivacyIcon>
                <PrivacyItemTitle>Secure Connections</PrivacyItemTitle>
                <PrivacyItemText>
                  All communications are encrypted and secure. Your conversations are protected with industry-standard security.
                </PrivacyItemText>
              </PrivacyItem>

              <PrivacyItem>
                <PrivacyIcon>🌐</PrivacyIcon>
                <PrivacyItemTitle>Global Access</PrivacyItemTitle>
                <PrivacyItemText>
                  Connect with people worldwide while maintaining your privacy and anonymity across all interactions.
                </PrivacyItemText>
              </PrivacyItem>
            </PrivacyContent>
          </PrivacySection>
        </Section>

        <Section>
          <SectionTitle>Platform Statistics</SectionTitle>
          <StatsSection>
            <StatCard>
              <StatNumber>100%</StatNumber>
              <StatLabel>Anonymous</StatLabel>
            </StatCard>
            <StatCard>
              <StatNumber>0</StatNumber>
              <StatLabel>Data Stored</StatLabel>
            </StatCard>
            <StatCard>
              <StatNumber>3</StatNumber>
              <StatLabel>Chat Modes</StatLabel>
            </StatCard>
            <StatCard>
              <StatNumber>24/7</StatNumber>
              <StatLabel>Available</StatLabel>
            </StatCard>
          </StatsSection>
        </Section>

        <MissionSection>
          <MissionTitle>Our Mission</MissionTitle>
          <MissionText>
            At Unitalks, we believe in the power of human connection without compromising privacy. Our platform enables meaningful conversations between people worldwide while ensuring complete anonymity and data protection. We're committed to providing a safe, secure, and user-friendly environment where genuine connections can flourish without the burden of personal data collection or storage.
          </MissionText>
        </MissionSection>
      </AboutContent>
      <Footer />
    </AboutContainer>
  );
}

export default About;
