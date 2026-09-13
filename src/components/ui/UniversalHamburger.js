import React, { useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiVideo, FiMic, FiMessageSquare, FiHome,
  FiInfo, FiHelpCircle, FiMail, FiShield, FiFileText, FiChevronRight,
} from 'react-icons/fi';
import ReportBugModal from './ReportBugModal';

const HamburgerButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: ${({ theme, $dark }) => ($dark ? theme.colors.inkSoft : theme.colors.paper)};
  color: ${({ theme, $dark }) => ($dark ? theme.colors.paper : theme.colors.ink)};
  border: 1.5px solid ${({ theme, $dark }) => ($dark ? 'rgba(255,255,255,0.25)' : theme.colors.ink)};
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active { transform: scale(0.94); }

  @media (max-width: 900px) {
    display: flex;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(28, 28, 30, 0.45);
  z-index: 1400;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.25s ease;
`;

const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  background: ${({ theme }) => theme.colors.paper};
  border-top-left-radius: ${({ theme }) => theme.radii.card};
  border-top-right-radius: ${({ theme }) => theme.radii.card};
  border-top: 1.5px solid ${({ theme }) => theme.colors.ink};
  padding: 10px 16px calc(20px + env(safe-area-inset-bottom));
  max-height: 88vh;
  overflow-y: auto;
  transform: translateY(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  transition: transform 0.32s cubic-bezier(0.34, 1.3, 0.64, 1);
`;

const Grabber = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.ink};
  margin: 6px auto 14px;
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
`;

const SheetTitle = styled.h2`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paperAlt};
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active { transform: scale(0.94); }
`;

const MenuRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  border-radius: ${({ theme }) => theme.radii.control};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.ink};
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  transition: background 0.15s ease, transform 0.12s ease;

  &:last-of-type { border-bottom: none; }
  &:active {
    background: ${({ theme }) => theme.colors.sunTint};
    transform: scale(0.98);
  }
`;

const RowIcon = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme, $accent }) => $accent || theme.colors.paperAlt};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
`;

const RowLabel = styled.span`
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.015em;
`;

const Chevron = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  display: flex;
  font-size: 18px;
`;

const ReportButton = styled.button`
  width: 100%;
  height: 52px;
  margin-top: 16px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active { transform: scale(0.98); }
`;

function UniversalHamburger({ showHomeLink = false, dark = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  const menuItems = [
    ...(showHomeLink ? [{ to: '/', label: 'Home', icon: FiHome }] : []),
    { to: '/text', label: 'Text Chat', icon: FiMessageSquare, accent: '#F9C74A' },
    { to: '/voice', label: 'Voice Chat', icon: FiMic, accent: '#7FB2F7' },
    { to: '/video', label: 'Video Chat', icon: FiVideo, accent: '#F59033' },
    { to: '/about', label: 'About', icon: FiInfo },
    { to: '/help', label: 'Help', icon: FiHelpCircle },
    { to: '/contact', label: 'Contact', icon: FiMail },
    { to: '/privacy', label: 'Privacy', icon: FiShield },
    { to: '/terms', label: 'Terms', icon: FiFileText },
  ];

  return (
    <>
      <HamburgerButton $dark={dark} onClick={() => setMenuOpen(true)} aria-label="Open menu">
        <FiMenu />
      </HamburgerButton>

      <Overlay $isOpen={menuOpen} onClick={closeMenu} />
      <Sheet $isOpen={menuOpen} role="dialog" aria-hidden={!menuOpen}>
        <Grabber />
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <CloseButton onClick={closeMenu} aria-label="Close menu">
            <FiX />
          </CloseButton>
        </SheetHeader>

        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <MenuRow
              key={item.to}
              to={item.to}
              onClick={closeMenu}
              $active={location.pathname === item.to}
            >
              <RowIcon $accent={item.accent}><Icon /></RowIcon>
              <RowLabel>{item.label}</RowLabel>
              <Chevron><FiChevronRight /></Chevron>
            </MenuRow>
          );
        })}

        <ReportButton onClick={() => { closeMenu(); setBugOpen(true); }}>
          Report Bug
        </ReportButton>
      </Sheet>

      {bugOpen && <ReportBugModal onClose={() => setBugOpen(false)} />}
    </>
  );
}

export default UniversalHamburger;
