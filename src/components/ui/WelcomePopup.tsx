import React, { useCallback } from 'react';
import { X, Globe, Zap, ArrowRight, Briefcase, Check } from "lucide-react";
import { Button } from './Button';
import { supabase } from '@/lib/supabase';

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
  isNewUser?: boolean;
  userEmail?: string;
}

export const WelcomePopup: React.FC<WelcomePopupProps> = ({ 
  isOpen, 
  onClose, 
  isNewUser = true, 
  userEmail 
}) => {
  // Function to notify admin about new user - wrapped in useCallback to prevent dependency changes
  const notifyAdminOfNewUser = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      const { error } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'new_user',
        message: `New user registration: ${userEmail}`,
        is_read: false,
        metadata: { email: userEmail, timestamp: new Date().toISOString() }
      });
      
      console.log('Admin notification sent for new user');
    } catch (error) {
      console.error('Failed to notify admin of new user:', error);
    }
  }, [userEmail]);

  // Call notification function if this is a new user
  React.useEffect(() => {
    if (isOpen && isNewUser && userEmail) {
      notifyAdminOfNewUser();
    }
  }, [isOpen, isNewUser, userEmail, notifyAdminOfNewUser]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is directly on the backdrop itself
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white dark:bg-dark-150 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 hover:bg-white dark:bg-dark-100/80 dark:hover:bg-dark-100 shadow-md transition-all"
        >
          <X className="w-6 h-6 text-orange-500 dark:text-orange-400" />
        </button>

        {/* Hero Section */}
        <div className="relative h-[20vh] bg-white dark:bg-dark-150 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5 bg-cover bg-center" />
          <div className="container mx-auto px-4 h-full flex flex-col justify-center items-center relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <h1 className="text-4xl md:text-5xl font-extrabold text-orange-500 dark:text-orange-400 tracking-tight">WELCOME</h1>
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AMP%20Logo-FdmXGeXuGBlr2AcoAFFlM8AqzmoyM1.png"
                alt="AMP Logo"
                className="h-12"
              />
            </div>
            <p className="text-orange-500 dark:text-orange-400 text-lg max-w-2xl text-center">
              Thank you for joining the AMP Portal System
            </p>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="py-8 bg-white dark:bg-dark-150">
          <div className="container mx-auto px-4">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange-50 dark:bg-dark-200 rounded-full border border-orange-200 dark:border-dark-300">
                <Zap className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <span className="text-orange-600 dark:text-orange-400 font-semibold tracking-wide">GETTING STARTED</span>
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="mb-6 p-6 bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-100 dark:border-dark-300">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Check className="w-5 h-5 mr-2 text-green-500" />
                  Your account has been created
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {isNewUser
                    ? "Welcome to the AMP Portal System! Your account has been created and your admin has been notified."
                    : "Welcome back to the AMP Portal System!"}
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-dark-300 rounded-full flex items-center justify-center mr-3">
                      <Globe className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Explore Our Portals</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Access a variety of specialized portals designed for different aspects of our operations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-dark-300 rounded-full flex items-center justify-center mr-3">
                      <ArrowRight className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Complete Your Profile</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Enhance your experience by updating your profile information and preferences.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-dark-300 rounded-full flex items-center justify-center mr-3">
                      <Briefcase className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Access Your Tools</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Use our specialized tools and resources to enhance your productivity and efficiency.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    className="bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 px-8 text-base rounded-full inline-flex items-center whitespace-nowrap"
                    onClick={onClose}
                  >
                    Get Started <span className="ml-1">›</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 