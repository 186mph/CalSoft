import React, { useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import HRPortal from './hr/page';
import { AuthProvider, RequireAuth } from '../lib/AuthContext';
import { ThemeProvider } from '../components/theme/theme-provider';
import { DivisionProvider } from '../App'; // Import from main App file
import { ChatWindowProvider } from '../context/ChatWindowContext';
import PortalLanding from './portal/page';
import AdminDashboard from './admin-dashboard/page';
import ProfileSetup from '../pages/ProfileSetup';
import DebugTableCheck from '../components/debug/debug-table';
import ChatDebug from '../components/chat/ChatDebug';
import { Layout } from '../components/ui/Layout';
import Login from '../components/auth/Login';

// Add a ScrollToTop component that will reset scroll position on route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  
  useLayoutEffect(() => {
    // Scroll to top on navigation except when user uses browser back/forward
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);
  
  return null;
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <DivisionProvider>
          <ChatWindowProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                {/* === Core Routes === */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/portal" replace />} />
                <Route path="/portal" element={<RequireAuth><PortalLanding /></RequireAuth>} />
                <Route path="/admin-dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
                <Route path="/profile-setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
                <Route path="/debug" element={<RequireAuth><Layout><DebugTableCheck /></Layout></RequireAuth>} />
                <Route path="/chat-debug" element={<RequireAuth><Layout><ChatDebug /></Layout></RequireAuth>} />

                {/* === HR Portal Route === */}
                <Route path="/hr" element={<RequireAuth><Layout><HRPortal /></Layout></RequireAuth>} />

                {/* === Lab Portal Routes === */}
                // ... existing code ...
              </Routes>
            </Router>
          </ChatWindowProvider>
        </DivisionProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App; 