import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Briefcase,
  LinkIcon,
  Mail,
  Edit2,
  X,
  Image,
  User
} from "lucide-react";
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Optional: for viewing other users' profiles
}

// Define the structure of user data
interface UserData extends SupabaseUser {
  user_metadata: {
    name?: string;
    role?: string;
    bio?: string;
    division?: string;
    birthday?: string;
    profileImage?: string;
    coverImage?: string;
    [key: string]: any;
  };
  email?: string;
}

// Simple component for the enlarged photo view
const EnlargedPhotoView: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose} // Close on background click
    >
      <div className="relative max-w-3xl max-h-[80vh]">
        <img src={src} alt="Enlarged Profile" className="block max-w-full max-h-full object-contain rounded-lg shadow-xl" />
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-white bg-black/30 hover:bg-black/50 rounded-full p-1.5"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState<UserData | null>(userId ? null : user as UserData);
  const [isPhotoEnlarged, setIsPhotoEnlarged] = useState(false);
  const [enlargedPhotoSrc, setEnlargedPhotoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!userId);
  const [attemptedMethods, setAttemptedMethods] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || userId === user?.id) {
        setProfileUser(user as UserData);
        setIsLoading(false);
        return;
      }

      const methods: string[] = [];
      try {
        setIsLoading(true);
        console.log(`Attempting to fetch profile for user ${userId}`);
        
        // Try all possible profile sources
        let profileFound = false;
        
        // Try to get profile from profiles table
        try {
          methods.push("profiles table (supabase client)");
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (!profileError && profileData) {
            console.log(`Found user ${userId} in profiles table:`, profileData);
            const userData: UserData = {
              id: userId,
              email: profileData.email,
              user_metadata: {
                name: profileData.full_name,
                role: profileData.role,
                bio: profileData.bio,
                division: profileData.division,
                birthday: profileData.birthday,
                profileImage: profileData.avatar_url,
                coverImage: profileData.cover_image
              }
            } as UserData;
            setProfileUser(userData);
            profileFound = true;
          } else {
            console.log(`Profile not found in profiles table: ${profileError?.message}`);
            
            // If the standard query fails, try a direct fetch
            console.log('Trying direct fetch to profiles endpoint...');
            try {
              methods.push("profiles table (direct fetch)");
              const response = await fetch(`https://vdxprdihmbqomwqfldpo.supabase.co/rest/v1/profiles?select=*&eq.id=${userId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
                }
              });
              
              if (response.ok) {
                const directData = await response.json();
                console.log('Direct fetch profiles response:', directData);
                
                if (directData && directData.length > 0) {
                  const profileData = directData[0];
                  
                  const userData: UserData = {
                    id: userId,
                    email: profileData.email,
                    user_metadata: {
                      name: profileData.full_name,
                      role: profileData.role,
                      bio: profileData.bio,
                      division: profileData.division,
                      birthday: profileData.birthday,
                      profileImage: profileData.avatar_url,
                      coverImage: profileData.cover_image
                    }
                  } as UserData;
                  setProfileUser(userData);
                  profileFound = true;
                }
              } else {
                console.log('Direct fetch profiles failed:', await response.text());
              }
            } catch (fetchErr) {
              console.error('Error with direct fetch profiles:', fetchErr);
            }
          }
        } catch (profileErr) {
          console.error('Error in profiles query:', profileErr);
        }
        
        // Try RPC method as fallback if profile not found
        if (!profileFound) {
          console.log(`Trying RPC method for user ${userId}`);
          // First try with the Supabase client
          try {
            methods.push("RPC method (Supabase client)");
            const { data, error } = await supabase.rpc('get_user_details', {
              user_id: userId 
            });
            
            console.log('RPC response:', { data, error });
            
            if (!error && data) {
              // Handle either array or single object response
              const userData_rpc = Array.isArray(data) ? data[0] : data;
              console.log(`Found user ${userId} via RPC:`, userData_rpc);
              
              const userData: UserData = {
                id: userId,
                email: userData_rpc.email,
                user_metadata: {
                  name: userData_rpc.name || userData_rpc.full_name,
                  role: userData_rpc.role,
                  bio: userData_rpc.bio,
                  division: userData_rpc.division,
                  birthday: userData_rpc.birthday,
                  profileImage: userData_rpc.profile_image || userData_rpc.avatar_url,
                  coverImage: userData_rpc.cover_image
                }
              } as UserData;
              setProfileUser(userData);
              profileFound = true;
            } else {
              console.log(`Profile not found via standard RPC: ${error?.message || 'No data returned'}`);
              
              // If the standard RPC fails, try a direct fetch call
              console.log('Trying direct fetch to RPC endpoint...');
              try {
                methods.push("RPC method (direct fetch)");
                const response = await fetch('https://vdxprdihmbqomwqfldpo.supabase.co/rest/v1/rpc/get_user_details', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
                  },
                  body: JSON.stringify({ user_id: userId })
                });
                
                if (response.ok) {
                  const directData = await response.json();
                  console.log('Direct fetch RPC response:', directData);
                  
                  if (directData) {
                    const directUserData = Array.isArray(directData) ? directData[0] : directData;
                    
                    const userData: UserData = {
                      id: userId,
                      email: directUserData.email,
                      user_metadata: {
                        name: directUserData.name || directUserData.full_name,
                        role: directUserData.role,
                        bio: directUserData.bio,
                        division: directUserData.division,
                        birthday: directUserData.birthday,
                        profileImage: directUserData.profile_image || directUserData.avatar_url,
                        coverImage: directUserData.cover_image
                      }
                    } as UserData;
                    setProfileUser(userData);
                    profileFound = true;
                  }
                } else {
                  console.log('Direct fetch RPC failed:', await response.text());
                }
              } catch (fetchErr) {
                console.error('Error with direct fetch RPC:', fetchErr);
              }
            }
          } catch (rpcErr) {
            console.error('Error in RPC call:', rpcErr);
          }
        }
        
        // Last resort: Try to get basic user info from auth.users via admin_get_user_basic function
        if (!profileFound) {
          console.log(`Trying to get basic user info for ${userId}`);
          
          // Try using get_user_metadata RPC function
          try {
            methods.push("RPC method (get_user_metadata)");
            const { data: metaData, error: metaError } = await supabase.rpc('get_user_metadata', { 
              p_user_id: userId 
            });
            
            if (!metaError && metaData) {
              console.log(`Found user ${userId} metadata via RPC:`, metaData);
              
              const userData: UserData = {
                id: userId,
                email: metaData.email,
                user_metadata: {
                  name: metaData.name || metaData.full_name || `User ${userId.substring(0, 6)}`,
                  role: metaData.role,
                  bio: metaData.bio,
                  division: metaData.division,
                  birthday: metaData.birthday,
                  profileImage: metaData.profile_image || metaData.avatar_url,
                  coverImage: metaData.cover_image
                }
              } as UserData;
              setProfileUser(userData);
              profileFound = true;
            } else {
              console.log(`Failed to get user metadata: ${metaError?.message}`);
              
              // If RPC fails, try the direct API call
              try {
                methods.push("RPC method (direct fetch to metadata endpoint)");
                console.log('Trying direct fetch to metadata endpoint...');
                const response = await fetch('https://vdxprdihmbqomwqfldpo.supabase.co/rest/v1/rpc/get_user_metadata', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
                  },
                  body: JSON.stringify({ p_user_id: userId })
                });
                
                if (response.ok) {
                  const directData = await response.json();
                  console.log('Direct fetch metadata response:', directData);
                  
                  if (directData) {
                    const userData: UserData = {
                      id: userId,
                      email: directData.email,
                      user_metadata: {
                        name: directData.name || directData.full_name || `User ${userId.substring(0, 6)}`,
                        role: directData.role,
                        bio: directData.bio,
                        division: directData.division,
                        birthday: directData.birthday,
                        profileImage: directData.profile_image || directData.avatar_url,
                        coverImage: directData.cover_image
                      }
                    } as UserData;
                    setProfileUser(userData);
                    profileFound = true;
                  }
                } else {
                  console.log('Direct fetch metadata failed:', await response.text());
                  
                  // Last resort - create minimal profile
                  const userData = {
                    id: userId,
                    email: null,
                    user_metadata: {
                      name: `User ${userId.substring(0, 6)}`,
                      role: null,
                      profileImage: null,
                      bio: null,
                      division: null,
                      birthday: null,
                      coverImage: null
                    }
                  } as unknown as UserData;
                  setProfileUser(userData);
                }
              } catch (fetchErr) {
                console.error('Error with direct fetch metadata:', fetchErr);
                
                // Last resort - create minimal profile
                const userData = {
                  id: userId,
                  email: null,
                  user_metadata: {
                    name: `User ${userId.substring(0, 6)}`,
                    role: null,
                    profileImage: null,
                    bio: null,
                    division: null,
                    birthday: null,
                    coverImage: null
                  }
                } as unknown as UserData;
                setProfileUser(userData);
              }
            }
          } catch (metaErr) {
            console.error('Error getting user metadata:', metaErr);
            
            // Create a minimal user profile as last resort
            const userData = {
              id: userId,
              email: null,
              user_metadata: {
                name: `User ${userId.substring(0, 6)}`,
                role: null,
                profileImage: null,
                bio: null,
                division: null,
                birthday: null,
                coverImage: null
              }
            } as unknown as UserData;
            setProfileUser(userData);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // Create a minimal backup profile to display something
        const userData = {
          id: userId,
          email: null,
          user_metadata: {
            name: `User ${userId.substring(0, 6)}`,
            role: null,
            bio: null,
            division: null,
            birthday: null,
            profileImage: null,
            coverImage: null
          }
        } as unknown as UserData;
        setProfileUser(userData);
      } finally {
        setIsLoading(false);
        
        // Store methods attempted for debugging
        setAttemptedMethods(methods);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId, user]);
  
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is directly on the backdrop itself
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Early return if not open
  if (!isOpen) return null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-dark-100 rounded-xl p-8 flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f26722]"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state if no profile found
  if (!profileUser) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-dark-100 rounded-xl p-8 text-center max-w-md">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profile Not Found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We couldn't find the user profile for ID: {userId ? userId.substring(0, 8) + '...' : 'Unknown'}. 
              The user may have been deleted or you may not have permission to view this profile.
            </p>
            
            {/* Debug information */}
            <div className="text-left text-xs text-gray-500 border-t border-gray-200 pt-3 mt-2 mb-4 w-full">
              <p className="font-medium mb-1">Debug Info (Attempted methods):</p>
              {attemptedMethods.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {attemptedMethods.map((method, index) => (
                    <li key={index}>{method}</li>
                  ))}
                </ul>
              ) : (
                <p>No fetch methods were attempted</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Refresh
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get user metadata
  const metadata = profileUser?.user_metadata || {};
  const {
    name,
    role,
    bio,
    division,
    birthday,
    profileImage,
    coverImage,
  } = metadata;

  // Log metadata for debugging
  console.log("Profile metadata:", metadata);
  console.log("Division value:", division);

  // Format birthday if available
  const formattedBirthday = birthday 
    ? new Date(birthday + 'T00:00:00Z').toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: 'UTC' // Force UTC to prevent date shifting
      })
    : null;

  const handlePhotoClick = (e: React.MouseEvent, photoSrc: string) => {
    e.stopPropagation(); // Prevent closing ProfileView if clicking on image inside
    setEnlargedPhotoSrc(photoSrc);
    setIsPhotoEnlarged(true);
  };

  const handleCloseEnlargedPhoto = () => {
    setIsPhotoEnlarged(false);
    setEnlargedPhotoSrc(null);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10"
        onClick={handleBackdropClick} // Add onClick to the backdrop
      >
        <div 
          className="relative w-full max-w-3xl bg-white dark:bg-dark-100 rounded-xl shadow-2xl overflow-hidden mx-4"
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
        >
          {/* Header with close button */}
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={onClose}
              className="text-white bg-black/20 hover:bg-black/40 rounded-full p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Cover Image */}
          <div 
            className="h-40 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-dark-200 dark:to-dark-300 relative overflow-hidden cursor-pointer"
            onClick={(e) => coverImage && handlePhotoClick(e, coverImage)}
          >
            {coverImage ? (
              <img 
                src={coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-dark-400">
                <Image className="w-10 h-10 opacity-50" />
              </div>
            )}
          </div>

          {/* Profile Content */}
          <div className="px-6 pb-6">
            {/* Profile Image */}
            <div className="relative -mt-16 mb-4">
              <div 
                className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-dark-100 shadow-xl bg-gray-200 dark:bg-dark-200 ${profileImage ? 'cursor-pointer' : ''}`}
                onClick={(e) => profileImage && handlePhotoClick(e, profileImage)}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-200">
                    <span className="text-4xl text-gray-400 dark:text-gray-600">{name ? name.charAt(0).toUpperCase() : '?'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-6">
              {/* Name and Role */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name || 'Anonymous User'}</h1>
                {role && (
                  <div className="mt-1 inline-flex items-center rounded-full bg-[#f26722]/10 px-2.5 py-0.5 text-xs font-medium text-[#f26722]">
                    {role}
                  </div>
                )}
                <p className="text-gray-500 dark:text-gray-400 mt-1">{profileUser?.email}</p>
              </div>

              {/* Bio */}
              {bio && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Bio</h2>
                  <p className="text-gray-700 dark:text-gray-300">{bio}</p>
                </div>
              )}

              {/* Contact & Personal Info */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Always display division section if it exists, even empty */}
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Briefcase className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">NETA Division</p>
                      <p>{division || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  {formattedBirthday && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <MapPin className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Birthday</p>
                        <p>{formattedBirthday}</p>
                      </div>
                    </div>
                  )}
                  
                  {profileUser?.email && (
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <Mail className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <a href={`mailto:${profileUser.email}`} className="text-[#f26722] hover:underline">
                          {profileUser.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged Photo Modal */}
      {isPhotoEnlarged && enlargedPhotoSrc && (
        <EnlargedPhotoView src={enlargedPhotoSrc} onClose={handleCloseEnlargedPhoto} />
      )}
    </>
  );
}; 