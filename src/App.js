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

const AppBackground = styled.div`
  height: 100vh;
  width: 100%;
  background: ${({ theme, $dark }) => ($dark ? theme.colors.ink : theme.colors.sun)};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-y: ${props => props.$isScrollableRoute ? 'auto' : 'hidden'};
  overflow-x: hidden;
`;

// Routes that use full-page scroll with footer at end (homepage, start-chat)
function AppContent() {
  const location = useLocation();
  const isScrollableRoute = location.pathname === '/' || location.pathname === '/start-chat';
  // Video and voice sit on the dark ink canvas; everything else on amber paper.
  const isDarkRoute = location.pathname === '/video' || location.pathname === '/voice';

  return (
    <AppBackground $dark={isDarkRoute} className={isDarkRoute ? 'bg-graph-grid-dark' : 'bg-graph-grid'}>
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
