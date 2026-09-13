import React, { useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import UniversalHamburger from '../ui/UniversalHamburger';
import ReportBugModal from '../ui/ReportBugModal';

const HeaderContainer = styled.div`
  background: ${({ theme, $dark }) => ($dark ? theme.colors.ink : theme.colors.sun)};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  border-bottom: 1px solid ${({ theme, $dark }) => ($dark ? 'rgba(255,255,255,0.10)' : 'rgba(28,28,30,0.10)')};
  height: 72px;
  display: flex;
  align-items: center;
  width: 100%;

  @media (max-width: 768px) {
    height: 60px;
  }
`;

const HeaderFlex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 24px;
  max-width: 1400px;
  margin: 0 auto;
  gap: 16px;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;

  img {
    height: 34px;
    width: auto;
    object-fit: contain;

    @media (max-width: 768px) {
      height: 28px;
    }
  }
`;

const BrandText = styled.span`
  color: ${({ theme, $dark }) => ($dark ? theme.colors.paper : theme.colors.ink)};
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;

  @media (max-width: 768px) { font-size: 21px; }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;

  @media (max-width: 900px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  text-decoration: none;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  padding: 11px 18px;
  border-radius: ${({ theme }) => theme.radii.control};
  transition: background 0.15s ease, color 0.15s ease;
  color: ${({ theme, $active, $dark }) =>
    $active ? theme.colors.paper : ($dark ? theme.colors.paper : theme.colors.ink)};
  background: ${({ theme, $active, $dark }) =>
    $active ? ($dark ? theme.colors.paper : theme.colors.ink) : 'transparent'};
  ${({ theme, $active, $dark }) => $active && $dark && `color: ${theme.colors.ink};`}

  &:hover {
    background: ${({ theme, $active, $dark }) =>
      $active
        ? ($dark ? theme.colors.paper : theme.colors.ink)
        : ($dark ? 'rgba(255,255,255,0.10)' : theme.colors.sunDeep)};
  }
`;

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const ReportPillButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
  border-radius: ${({ theme }) => theme.radii.control};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $dark }) => ($dark ? theme.colors.inkSoft : theme.colors.paper)};
  color: ${({ theme, $dark }) => ($dark ? theme.colors.paper : theme.colors.ink)};
  border: 1.5px solid ${({ theme, $dark }) => ($dark ? 'rgba(255,255,255,0.25)' : theme.colors.ink)};
  transition: background 0.15s ease, transform 0.12s ease;

  &:hover { background: ${({ theme, $dark }) => ($dark ? '#3A3A3C' : theme.colors.paperAlt)}; }
  &:active { transform: scale(0.97); }

  @media (max-width: 560px) { display: none; }
`;

const AnonMark = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: ${({ theme, $dark }) => ($dark ? theme.colors.inkSoft : theme.colors.ink)};
  color: ${({ theme }) => theme.colors.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 17px;

  @media (max-width: 900px) { display: none; }
`;

const navLinks = [
  { to: '/text', label: 'Text Chat' },
  { to: '/voice', label: 'Voice Chat' },
  { to: '/video', label: 'Video Chat' },
];

function Header({ hasSidebar = false }) {
  const location = useLocation();
  const [bugOpen, setBugOpen] = useState(false);
  // Video and voice run on the dark ink canvas, so the header inverts there.
  const isDark = location.pathname === '/video' || location.pathname === '/voice';

  return (
    <HeaderContainer $hasSidebar={hasSidebar} $dark={isDark}>
      <HeaderFlex>
        <Logo to="/">
          <img src="/assets/logos/logo.png" alt="UniTalks Logo" />
          <BrandText $dark={isDark}>UniTalks</BrandText>
        </Logo>

        <Nav>
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              $active={location.pathname.startsWith(link.to)}
              $dark={isDark}
            >
              {link.label}
            </NavLink>
          ))}
        </Nav>

        <RightGroup>
          <ReportPillButton $dark={isDark} onClick={() => setBugOpen(true)}>
            Report Bug
          </ReportPillButton>
          <AnonMark $dark={isDark} aria-hidden="true" title="You are anonymous">
            <FiUser />
          </AnonMark>
          <UniversalHamburger showHomeLink={true} dark={isDark} />
        </RightGroup>
      </HeaderFlex>

      {bugOpen && <ReportBugModal onClose={() => setBugOpen(false)} />}
    </HeaderContainer>
  );
}

export default Header;
