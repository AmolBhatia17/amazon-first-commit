import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const FooterOuter = styled.footer`
  width: 100%;
  padding: 24px 24px 28px;
  display: flex;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 16px 16px 20px;
  }
`;

const FooterCard = styled.div`
  width: 100%;
  max-width: 1400px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 20px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 18px 20px;
    border-radius: ${({ theme }) => theme.radii.panel};
  }
`;

const FooterLinks = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
`;

const FooterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.ink};
  text-decoration: none;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  padding: 4px 10px;
  border-radius: 8px;
  transition: background 0.15s ease;

  &:hover { background: ${({ theme }) => theme.colors.sunTint}; }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.line};
  font-size: 14px;
  user-select: none;
`;

const Copyright = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  font-weight: 500;
  margin: 0;
`;

const links = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/help', label: 'Help' },
];

function Footer() {
  return (
    <FooterOuter>
      <FooterCard>
        <FooterLinks>
          {links.map((link, i) => (
            <React.Fragment key={link.to}>
              {i > 0 && <Separator>|</Separator>}
              <FooterLink to={link.to}>{link.label}</FooterLink>
            </React.Fragment>
          ))}
        </FooterLinks>
        <Copyright>
          © {new Date().getFullYear()} UniTalks — Safe &amp; Anonymous Student Chat
        </Copyright>
      </FooterCard>
    </FooterOuter>
  );
}

export default Footer;
