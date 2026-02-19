import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const FooterContainer = styled.footer`
  width: 100%;
  margin-top: auto;
  background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, #0a0a0a 15%, #000 100%);
  color: #F8FAFC;
  padding: 2rem 0 1.75rem;
  text-align: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  border-top: 1px solid rgba(29, 185, 84, 0.15);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    max-width: 200px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(29, 185, 84, 0.4), transparent);
    opacity: 0.8;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const FooterLinks = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  margin-bottom: 1.25rem;
  @media (max-width: 768px) {
    gap: 0.2rem 0.75rem;
  }
`;

const FooterLink = styled(Link)`
  color: #a0a0a0;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s, transform 0.2s;
  padding: 0.4rem 0.75rem;
  border-radius: 10px;

  &:hover {
    color: #1DB954;
    background: rgba(29, 185, 84, 0.08);
    transform: translateY(-1px);
  }
  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.35rem 0.6rem;
  }
`;

const Separator = styled.span`
  color: rgba(255,255,255,0.2);
  font-weight: 200;
  user-select: none;
  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const Copyright = styled.div`
  color: #666;
  font-size: 0.9rem;
  font-weight: 400;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  @media (max-width: 768px) {
    font-size: 0.82rem;
  }
`;

const BrandName = styled.span`
  color: #1DB954;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

function Footer() {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterLinks>
          <FooterLink to="/privacy">Privacy</FooterLink>
          <Separator>·</Separator>
          <FooterLink to="/terms">Terms</FooterLink>
          <Separator>·</Separator>
          <FooterLink to="/about">About</FooterLink>
          <Separator>·</Separator>
          <FooterLink to="/contact">Contact</FooterLink>
          <Separator>·</Separator>
          <FooterLink to="/help">Help</FooterLink>
        </FooterLinks>
        <Copyright>
          © 2025 <BrandName>UniTalks</BrandName>. All rights reserved.
        </Copyright>
      </FooterContent>
    </FooterContainer>
  );
}

export default Footer;
