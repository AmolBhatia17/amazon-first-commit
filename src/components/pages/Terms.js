import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

import * as CP from '../ui/ContentPage';

/* Amber Paper content-page kit (see ../ui/ContentPage). */
const TermsContainer = CP.Shell;
const TermsContent = CP.Wrap;
const ContentCard = CP.Card;
const TermsTitle = CP.Title;
const EffectiveDate = CP.Meta;
const WelcomeParagraph = CP.Subtitle;
const Section = CP.Section;
const SectionTitle = CP.SectionTitle;
const Paragraph = CP.Paragraph;
const UnorderedList = CP.List;
const ListItem = CP.ListItem;

function Terms() {
  return (
    <TermsContainer>
      <Header 
        logo="Unitalks"
        hasSidebar={false}
      />
      
      <TermsContent>
        <TermsTitle>Terms and Conditions</TermsTitle>
        <EffectiveDate>Effective Date: 05/08/2025</EffectiveDate>
        <ContentCard>
          <WelcomeParagraph>
            Welcome to Unitalks! By using this website, you agree to the following terms and conditions. Please read them carefully before continuing.
          </WelcomeParagraph>

          <Section>
            <SectionTitle>1. No Account Required</SectionTitle>
            <Paragraph>
              Our service does not require users to create an account. You can use our platform anonymously without registration.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>2. No Data Collection</SectionTitle>
            <Paragraph>
              We do not collect, store, or share any personally identifiable information. However, standard technical information (such as IP address or device type) may be logged temporarily for security and performance reasons but is not used to identify users.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>3. User Conduct</SectionTitle>
            <Paragraph>By using this website, you agree not to:</Paragraph>
            <UnorderedList>
              <ListItem>Share or request personal information (real name, address, phone number, etc.)</ListItem>
              <ListItem>Transmit illegal, harmful, abusive, or sexually explicit content</ListItem>
              <ListItem>Impersonate others or misrepresent your identity</ListItem>
              <ListItem>Harass, threaten, or intimidate other users</ListItem>
              <ListItem>Use the service for spamming or commercial solicitation</ListItem>
            </UnorderedList>
            <Paragraph>
              We reserve the right to ban users who violate these rules.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>4. Use at Your Own Risk</SectionTitle>
            <Paragraph>
              This platform connects users randomly for text/video chat. We do not monitor conversations. By using the site, you understand that:
            </Paragraph>
            <UnorderedList>
              <ListItem>You may encounter inappropriate behavior or content</ListItem>
              <ListItem>We are not liable for user conduct during chats</ListItem>
            </UnorderedList>
            <Paragraph>
              Please report abuse using the provided reporting tools (if available).
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>5. Age Restriction</SectionTitle>
            <Paragraph>
              You must be at least 18 years old to use this website. By using the service, you confirm that you meet this age requirement.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>6. Disclaimer of Warranty</SectionTitle>
            <Paragraph>
              This service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>7. Limitation of Liability</SectionTitle>
            <Paragraph>
              To the maximum extent permitted by law, Unitalks is not responsible for any damages arising from the use or inability to use the service.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>8. Changes to Terms</SectionTitle>
            <Paragraph>
              We may update these Terms from time to time. Continued use of the service means you accept the revised Terms.
            </Paragraph>
          </Section>

          <Section>
            <SectionTitle>9. Governing Law</SectionTitle>
            <Paragraph>
              These Terms shall be governed by and construed in accordance with the laws of Delhi, India.
            </Paragraph>
          </Section>
        </ContentCard>
      </TermsContent>
      <Footer />
    </TermsContainer>
  );
}

export default Terms;
