import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { EditProfilePopup } from '../components/ui/EditProfilePopup';

export default function ProfileSetup() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    // Only open the popup once the auth state is confirmed and we have a user
    if (!authLoading && user) {
      console.log("User confirmed, opening profile setup popup for:", user.email);
      setIsPopupOpen(true);
    } else if (!authLoading && !user) {
      // If auth is loaded but there's no user, redirect to login
      // This handles cases where someone navigates here directly without verifying
      console.log("No authenticated user found on profile setup page, redirecting to login.");
      navigate('/login');
    } else {
      console.log("Waiting for authentication check...");
    }
  }, [user, authLoading, navigate]);

  const handleProfileSetupComplete = () => {
    console.log("Profile setup complete, navigating to portal.");
    setIsPopupOpen(false);
    // After setup, navigate the user to their main dashboard/portal
    navigate('/portal');
  };

  if (authLoading) {
    // Show a loading indicator while checking auth state
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p>Verifying account...</p>
        {/* You could add a spinner here */}
      </div>
    );
  }

  // Render the popup once the user is confirmed
  // Or show a message if the user isn't loaded yet (should be brief)
  return (
    <div className="min-h-screen bg-white">
      {isPopupOpen && user ? (
         <EditProfilePopup
          isOpen={isPopupOpen}
          onClose={handleProfileSetupComplete}
          currentUser={user} // Pass the authenticated user object
          isNewUser={true} // Indicate this is the initial setup
        />
      ) : (
        // Only show redirecting message if popup isn't open and auth isn't loading
        !authLoading && <p className="text-center pt-10">Loading profile editor or redirecting...</p>
      )}
    </div>
  );
} 