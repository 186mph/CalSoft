import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Users,        // For Customers/Contacts
  BriefcaseIcon, // For Opportunities
  LogOut,
  MapPin,
  User as UserIcon,
  Settings,
  FileText,
  Eye,
  Target,       // For Goals
  BarChart,     // For Dashboard
  Building      // For Customers
} from "lucide-react"
import { Button } from './Button';
import { ThemeToggle } from '../theme/theme-toggle';
import { SettingsPopup } from './SettingsPopup';
import { ProfileView } from '../profile/ProfileView';
import { AboutPopup } from './AboutPopup';
import { ChatButton } from '../chat/ChatButton';

interface SalesLayoutProps {
  children: React.ReactNode;
}

export const SalesLayout: React.FC<SalesLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Effect to close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  if (!user) return <div className="min-h-screen">{children}</div>; // Should be handled by RequireAuth but good fallback

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/login';
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleViewProfile = () => {
    setIsProfileMenuOpen(false);
    setIsProfileViewOpen(true);
  };

  const handleSettings = () => {
    setIsProfileMenuOpen(false);
    setSettingsMenuOpen(true);
  };

  const handleAbout = () => {
    setIsProfileMenuOpen(false);
    setIsAboutOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background dark:bg-dark-background">
      {/* Sidebar */}
      <div className="w-64 min-w-64 flex-shrink-0 flex-col border-r border-black/10 bg-white dark:bg-dark-150 dark:border-dark-200 flex">
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-black/10 dark:border-dark-200 px-6">
          <Link to="/portal">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AMP%20Logo-FdmXGeXuGBlr2AcoAFFlM8AqzmoyM1.png"
              alt="AMP Logo"
              className="h-12 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
        {/* Sidebar Links */}
        <div className="flex flex-col gap-1 p-4 flex-grow">
          <h2 className="px-2 text-xs font-semibold text-muted-foreground dark:text-dark-500">MENU</h2>
          <div className="flex flex-col gap-1">
            {/* Sales Dashboard Link */}
            <Link to="/sales-dashboard">
              <Button
                variant="ghost"
                className={`w-full justify-start pl-0 text-left font-medium text-black dark:text-dark-900 hover:bg-black/5 dark:hover:bg-dark-50 !justify-start ${
                  location.pathname === '/sales-dashboard' ? 'bg-black/5 dark:bg-dark-50' : ''
                }`}
              >
                <BarChart className="h-4 w-4 mr-2" />
                Sales Dashboard
              </Button>
            </Link>
            
            {/* Opportunities Link */}
            <Link to="/sales-dashboard/opportunities">
              <Button
                variant="ghost"
                className={`w-full justify-start pl-0 text-left font-medium text-black dark:text-dark-900 hover:bg-black/5 dark:hover:bg-dark-50 !justify-start ${
                  location.pathname.startsWith('/sales-dashboard/opportunities') ? 'bg-black/5 dark:bg-dark-50' : ''
                }`}
              >
                <BriefcaseIcon className="h-4 w-4 mr-2" />
                Opportunities
              </Button>
            </Link>
            
            {/* Sales Goals Link - NEW */}
            <Link to="/sales/goals">
              <Button
                variant="ghost"
                className={`w-full justify-start pl-0 text-left font-medium text-black dark:text-dark-900 hover:bg-black/5 dark:hover:bg-dark-50 !justify-start ${
                  location.pathname.startsWith('/sales/goals') ? 'bg-black/5 dark:bg-dark-50' : ''
                }`}
              >
                <Target className="h-4 w-4 mr-2" />
                Sales Goals
              </Button>
            </Link>
            
            {/* Customers Link - now using sales-specific path */}
            <Link to="/sales-dashboard/customers" state={{ from: 'sales' }}>
              <Button
                variant="ghost"
                className={`w-full justify-start pl-0 text-left font-medium text-black dark:text-dark-900 hover:bg-black/5 dark:hover:bg-dark-50 !justify-start ${
                  location.pathname.startsWith('/customers') || location.pathname.startsWith('/sales-dashboard/customers') ? 'bg-black/5 dark:bg-dark-50' : ''
                }`}
              >
                <Building className="h-4 w-4 mr-2" />
                Customers
              </Button>
            </Link>
            
            {/* Contacts Link - now using sales-specific path */}
            <Link to="/sales-dashboard/contacts" state={{ from: 'sales' }}>
              <Button
                variant="ghost"
                className={`w-full justify-start pl-0 text-left font-medium text-black dark:text-dark-900 hover:bg-black/5 dark:hover:bg-dark-50 !justify-start ${
                  location.pathname.startsWith('/contacts') || location.pathname.startsWith('/sales-dashboard/contacts') ? 'bg-black/5 dark:bg-dark-50' : ''
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                Contacts
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header (Same as in Layout.tsx) */}
        <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-sm dark:bg-dark-150/75 dark:border-dark-200">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-20 items-center justify-end">
              <div className="flex items-center">
                <ChatButton />
                <div className="relative" ref={profileMenuRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-10 h-10 hover:bg-gray-100 dark:hover:bg-dark-50 p-0 overflow-hidden"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  >
                    {user?.user_metadata?.profileImage ? (
                      <img
                        src={user.user_metadata.profileImage}
                        alt="Profile"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-5 w-5 text-gray-600 dark:text-dark-400" />
                    )}
                  </Button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-dark-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-200">
                          <p className="text-sm font-medium text-gray-900 dark:text-dark-900">
                            {user?.user_metadata?.name || 'User'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-dark-400 truncate">
                            {user?.user_metadata?.role || 'No role assigned'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-dark-500 truncate mt-1">
                            {user?.email || 'Loading...'}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('/portal')}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-accent-color hover:bg-gray-100 dark:hover:bg-dark-50"
                        >
                          <MapPin className="mr-3 h-5 w-5 text-gray-400 dark:text-accent-color" />
                          Back to Portal
                        </button>
                        <button
                          onClick={handleViewProfile}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-accent-color hover:bg-gray-100 dark:hover:bg-dark-50"
                        >
                          <Eye className="mr-3 h-5 w-5 text-gray-400 dark:text-accent-color" />
                          View Profile
                        </button>
                        <button
                          onClick={handleSettings}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-accent-color hover:bg-gray-100 dark:hover:bg-dark-50"
                        >
                          <Settings className="mr-3 h-5 w-5 text-gray-400 dark:text-accent-color" />
                          Settings
                        </button>
                        <button
                          onClick={handleAbout}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-accent-color hover:bg-gray-100 dark:hover:bg-dark-50"
                        >
                          <FileText className="mr-3 h-5 w-5 text-gray-400 dark:text-accent-color" />
                          About
                        </button>
                        <button
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-accent-color hover:bg-gray-100 dark:hover:bg-dark-50"
                        >
                          <LogOut className="mr-3 h-5 w-5 text-gray-400 dark:text-accent-color" />
                          {isSigningOut ? 'Signing out...' : 'Sign Out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Popup */}
        <SettingsPopup 
          isOpen={settingsMenuOpen}
          onClose={() => setSettingsMenuOpen(false)}
          onAbout={handleAbout}
          currentUser={user}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Profile View Modal */}
      {isProfileViewOpen && (
        <ProfileView 
          isOpen={isProfileViewOpen} 
          onClose={() => setIsProfileViewOpen(false)} 
        />
      )}

      <AboutPopup
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <Outlet />
    </div>
  );
};

export default SalesLayout;