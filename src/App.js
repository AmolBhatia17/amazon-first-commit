import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Homepage from './components/pages/Homepage';
import StartChat from './components/pages/StartChat';
import About from './components/pages/About';
import Privacy from './components/pages/Privacy';
import Terms from './components/pages/Terms';
import Help from './components/pages/Help';
import Contact from './components/pages/Contact';
import VideoChat from './components/pages/VideoChat';
import AudioChat from './components/pages/AudioChat';
import TextChat from './components/pages/TextChat';

/**
 * Chat routes are pinned to the viewport (their message lists scroll
 * internally). Long-form routes scroll the *document* instead of an inner
 * box — native page scroll keeps momentum and the mobile URL bar behaving,
 * which an inner `overflow: auto` container does not.
 */
const AppBackground = styled.div`
  width: 100%;
  background: ${({ theme, $dark }) => ($dark ? theme.colors.ink : theme.colors.sun)};
  display: flex;
  flex-direction: column;

  ${({ $scrollable }) => $scrollable
    ? 'min-height: 100vh;'
    : 'height: 100vh; overflow: hidden;'}
`;

const MainContent = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-x: hidden;

  ${({ $isScrollableRoute }) => $isScrollableRoute
    ? 'flex: 1 0 auto;'
    : 'flex: 1; min-height: 0; overflow-y: hidden;'}
`;

// Only the three chat modes are locked to the viewport (their message lists
// scroll internally). Every other route is long-form and scrolls the page.
const FIXED_HEIGHT_ROUTES = ['/text', '/voice', '/video'];

function AppContent() {
  const location = useLocation();
  const isScrollableRoute = !FIXED_HEIGHT_ROUTES.includes(location.pathname);
  // Video and voice sit on the dark ink canvas; everything else on amber paper.
  const isDarkRoute = location.pathname === '/video' || location.pathname === '/voice';

  return (
    <AppBackground
      $dark={isDarkRoute}
      $scrollable={isScrollableRoute}
      className={isDarkRoute ? 'bg-graph-grid-dark' : 'bg-graph-grid'}
    >
      <MainContent $isScrollableRoute={isScrollableRoute}>
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/start-chat" element={<StartChat />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              <Route path="/help" element={<Help />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/voice" element={<AudioChat />} />
              <Route path="/video" element={<VideoChat />} />
              <Route path="/text" element={<TextChat />} />
            </Routes>
      </MainContent>
    </AppBackground>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
