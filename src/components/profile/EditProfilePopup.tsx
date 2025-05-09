import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, X, Upload, ChevronLeft, ChevronRight, Mail, MapPin, Briefcase, Calendar, LinkIcon, Check, Camera, ChevronDown, Eye, Image } from "lucide-react";
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ProfileView } from './ProfileView';

interface EditProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
    profileImage?: string;
  };
  isNewUser?: boolean;
}

// Function to get cropped image blob
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.resolve(null);
  }

  const pixelRatio = window.devicePixelRatio;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          resolve(null);
          return;
        }
        resolve(new File([blob], fileName, { type: blob.type }));
      },
      'image/jpeg', // Adjust type if needed (e.g., 'image/png')
      0.9 // Adjust quality (0 to 1)
    );
  });
}

// Function to get resized image blob
async function getResizedImg(
  image: HTMLImageElement,
  fileName: string,
  maxWidth: number,
  maxHeight: number
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  canvas.width = image.naturalWidth * scale;
  canvas.height = image.naturalHeight * scale;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty after resize');
          resolve(null);
          return;
        }
        resolve(new File([blob], fileName, { type: blob.type }));
      },
      'image/jpeg', 
      0.85 // Slightly lower quality for resized might be okay
    );
  });
}

// Recommended aspect ratio for cover images
const COVER_ASPECT = 16 / 5; // Adjust as needed
const COVER_MAX_WIDTH = 1600; // Example max width
const COVER_MAX_HEIGHT = COVER_MAX_WIDTH / COVER_ASPECT; // ~640px

export const EditProfilePopup: React.FC<EditProfilePopupProps> = ({
  isOpen,
  onClose,
  currentUser,
  isNewUser = false
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(currentUser?.name || '');
  const [selectedRole, setSelectedRole] = useState(currentUser?.role || '');
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');
  const [division, setDivision] = useState(user?.user_metadata?.division || '');
  const [birthday, setBirthday] = useState(user?.user_metadata?.birthday || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isImageHovering, setIsImageHovering] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Cropping state
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update state when user metadata changes
  useEffect(() => {
    if (user?.user_metadata) {
      setName(user.user_metadata.name || '');
      setSelectedRole(user.user_metadata.role || '');
      setBio(user.user_metadata.bio || '');
      setDivision(user.user_metadata.division || '');
      setBirthday(user.user_metadata.birthday || '');
      setProfileImage(user.user_metadata.profileImage || null);
      setCoverImage(user.user_metadata.coverImage || null);
    }
  }, [user?.user_metadata]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const availableRoles = [
    'Admin',
    'NETA Technician',
    'Lab Technician',
    'Sales Representative',
    'Office Admin',
    'HR Representative',
    'Engineering',
    'Scavenger'
  ];

  const divisions = [
    'North Alabama',
    'Tennessee',
    'International',
    'Georgia'
  ];

  const uploadProfileImage = async (file: File): Promise<string> => {
    console.log('Starting upload process (using direct fetch)...');
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get session token
    console.log('-> About to call supabase.auth.getSession()');
    let sessionData;
    try {
      sessionData = await supabase.auth.getSession();
    } catch (e) {
      console.error('!!! Error DURING supabase.auth.getSession call:', e);
      throw e;
    }
    console.log('<- Finished supabase.auth.getSession call');
    
    const { data: { session }, error: sessionError } = sessionData;
    if (sessionError || !session) {
      console.error('Failed to get session:', sessionError);
      throw new Error('Could not get user session for upload.');
    }
    const token = session.access_token;

    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const storagePath = `user-uploads/profile-images/${fileName}`;
    
    // Construct the Supabase Storage URL
    // Ensure VITE_SUPABASE_URL is defined and accessible
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not defined');
    }
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${storagePath}`;

    // Log details
    console.log('File details:', { fileName, storagePath, fileSize: file.size, fileType: file.type });
    console.log('Upload URL:', uploadUrl);

    try {
      console.log('-> Starting fetch upload...');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type,
          'x-upsert': 'true' // Use x-upsert header for upsert behavior
        },
        body: file
      });
      console.log('<- Finished fetch upload call');

      console.log('Fetch response status:', response.status);
      console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Fetch upload failed:', { status: response.status, body: errorBody });
        throw new Error(`Upload failed with status ${response.status}: ${errorBody}`);
      }

      // If successful, construct the public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
      console.log('Constructed public URL:', publicUrl);

      // Update the profile image state immediately
      setProfileImage(publicUrl);

      // Update user metadata with new image URL
      console.log('Updating user metadata...');
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, profileImage: publicUrl }
      });

      if (updateError) {
        console.error('Failed to update user metadata:', updateError);
        throw new Error('Failed to update profile: ' + updateError.message);
      }

      console.log('Profile image update completed successfully');
      return publicUrl;

    } catch (error) {
      console.error('Error in direct fetch upload:', error);
      if (error instanceof Error) {
        console.error('Error details:', { name: error.name, message: error.message, stack: error.stack });
      }
      throw error;
    }
  };

  const uploadCoverImage = async (file: File): Promise<string> => {
    console.log('Starting cover image upload...');
    if (!user) throw new Error('User not authenticated');

    const sessionData = await supabase.auth.getSession();
    const { data: { session }, error: sessionError } = sessionData;
    if (sessionError || !session) {
      console.error('Failed to get session:', sessionError);
      throw new Error('Could not get user session for upload.');
    }
    const token = session.access_token;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_cover_${Date.now()}.${fileExt}`;
    const storagePath = `user-uploads/cover-images/${fileName}`; // Changed path
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is not defined');
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${storagePath}`;

    console.log('Cover file details:', { fileName, storagePath, fileSize: file.size, fileType: file.type });

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type,
          'x-upsert': 'true'
        },
        body: file
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Cover upload failed:', { status: response.status, body: errorBody });
        throw new Error(`Upload failed with status ${response.status}: ${errorBody}`);
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
      console.log('Constructed cover public URL:', publicUrl);

      // Update state immediately
      setCoverImage(publicUrl);

      // Update metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, coverImage: publicUrl } // Changed field
      });

      if (updateError) {
        console.error('Failed to update user metadata (cover):', updateError);
        throw new Error('Failed to update cover image: ' + updateError.message);
      }

      console.log('Cover image update completed successfully');
      return publicUrl;

    } catch (error) {
      console.error('Error in cover image upload:', error);
      throw error;
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        console.log('Starting image upload process...');
        
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size should be less than 5MB');
          return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          alert('Please upload an image file');
          return;
        }

        console.log('File validation passed');

        // Delete old profile image if exists
        if (profileImage) {
          try {
            console.log('Attempting to delete old image:', profileImage);
            // Extract the path from the full URL
            const url = new URL(profileImage);
            const pathParts = url.pathname.split('/');
            const oldFilePath = pathParts[pathParts.length - 1];
            
            if (oldFilePath) {
              console.log('Deleting old image:', `profile-images/${oldFilePath}`);
              const { error: deleteError } = await supabase.storage
                .from('user-uploads')
                .remove([`profile-images/${oldFilePath}`]);
                
              if (deleteError) {
                console.error('Failed to delete old image:', deleteError);
              } else {
                console.log('Old image deleted successfully');
              }
            }
          } catch (deleteError) {
            console.error('Error deleting old image:', deleteError);
          }
        }

        // Upload new image
        console.log('Starting new image upload...');
        const publicUrl = await uploadProfileImage(file);
        console.log('New profile image URL:', publicUrl);
        
        // State and metadata are already updated in uploadProfileImage function

      } catch (error) {
        console.error('Error in handleImageUpload:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  // -- CROPPER FUNCTIONS --
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, // Start with 90% width crop
        },
        COVER_ASPECT,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
    setCompletedCrop(undefined); // Reset completed crop when image loads
  }

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current || !originalFileName) {
      console.error('Crop details or image ref missing');
      return;
    }

    try {
      setIsSubmitting(true); // Show loading indicator on confirm
      const croppedFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        originalFileName
      );

      if (croppedFile) {
        // Optional: Delete old before uploading new
        if (coverImage) {
          try {
            const url = new URL(coverImage);
            const pathParts = url.pathname.split('/');
            const oldFilePath = pathParts.pop();
            const folderPath = pathParts.slice(-2).join('/');
            if (oldFilePath && folderPath === 'cover-images') {
              const fullPath = `cover-images/${oldFilePath}`;
              console.log('Deleting old cover image before cropping confirm:', fullPath);
              await supabase.storage.from('user-uploads').remove([fullPath]);
            }
          } catch (deleteError) {
            console.error('Error deleting old cover image before crop confirm:', deleteError);
          }
        }
        // Upload the cropped file
        await uploadCoverImage(croppedFile);
        console.log('Cropped image uploaded successfully');
      } else {
        alert('Could not process the image crop.');
      }
    } catch (error) {
      console.error('Error during crop confirmation and upload:', error);
      alert('Failed to upload cropped image.');
    } finally {
      setIsCropping(false);
      setImgSrc(''); // Clear image source
      setOriginalFileName('');
      setCrop(undefined);
      setCompletedCrop(undefined);
      setIsSubmitting(false);
      // Reset file input value to allow re-uploading the same file if needed
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  };

  const handleFitImage = async () => {
    if (!imgRef.current || !originalFileName) {
      console.error('Image ref or filename missing for fit operation');
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Resize the image using the helper function
      const resizedFile = await getResizedImg(
        imgRef.current,
        originalFileName,
        COVER_MAX_WIDTH,
        COVER_MAX_HEIGHT
      );

      if (!resizedFile) {
        alert('Could not process the image for fitting.');
        throw new Error('Resizing failed');
      }
        
      // Optional: Delete old before uploading new
      if (coverImage) {
        try {
          const url = new URL(coverImage);
          const pathParts = url.pathname.split('/');
          const oldFilePath = pathParts.pop();
          const folderPath = pathParts.slice(-2).join('/');
          if (oldFilePath && folderPath === 'cover-images') {
            const fullPath = `cover-images/${oldFilePath}`;
            console.log('Deleting old cover image before fitting:', fullPath);
            await supabase.storage.from('user-uploads').remove([fullPath]);
          }
        } catch (deleteError) {
          console.error('Error deleting old cover image before fit:', deleteError);
        }
      }
      
      // Upload the RESIZED file
      await uploadCoverImage(resizedFile);
      console.log('Resized image uploaded (Fit option)');

    } catch (error) {
      console.error('Error fitting/uploading resized image:', error);
      alert('Failed to upload fitted image.');
    } finally {
      // Reset state regardless of success/failure
      setIsCropping(false);
      setImgSrc('');
      setOriginalFileName('');
      setIsSubmitting(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  };

  // -- COVER IMAGE UPLOAD TRIGGER --
  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Increased limit slightly for cropping flexibility
        alert('File size should be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Read the file and open the cropper
      setOriginalFileName(file.name);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Prepare metadata, explicitly excluding role
      const userMetadata: { [key: string]: any } = {
        name,
        bio,
        division,
        birthday,
        // DO NOT include 'role' here - it should only be updated by admins
      };

      // Add profile image URL if it exists 
      if (profileImage) {
        userMetadata.profileImage = profileImage;
      }

      // Add cover image URL if it exists
      if (coverImage) {
        userMetadata.coverImage = coverImage;
      }

      const { error } = await supabase.auth.updateUser({
        data: userMetadata
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewProfile = () => {
    setShowDropdown(false);
    setShowProfileView(true);
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Handle backdrop click for the cropping modal
  const handleCropBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is directly on the backdrop itself
    if (e.target === e.currentTarget) {
      setIsCropping(false);
      setImgSrc(''); // Clear image source to reset
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm ${isCropping ? 'hidden' : ''}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-3xl bg-white dark:bg-dark-100 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative">
            {/* Cover Image Area */}
            <div className="h-40 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-dark-200 dark:to-dark-300 relative group">
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-dark-400">
                  {/* Placeholder content if no cover image */}
                  <Image className="w-10 h-10 opacity-50" />
                </div>
              )}
              {/* Edit Cover Button Overlay */}
              <button
                onClick={() => coverFileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 mr-2" />
                Change Cover
              </button>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                className="hidden"
              />
            </div>

            {/* Profile Image & Info Row */}
            <div className="p-4 flex items-end justify-between border-b border-gray-200 dark:border-dark-200 relative -mt-12 z-10">
              {/* Left side: Profile Image and Edit Profile Title */}
              <div className="flex items-end space-x-4">
                {/* Profile Image with Dropdown */}
                <div
                  className="relative"
                  ref={dropdownRef}
                >
                  <div 
                    className="w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-dark-100 shadow-xl cursor-pointer bg-gray-200 dark:bg-dark-200"
                    onClick={() => setShowDropdown(!showDropdown)}
                    onMouseEnter={() => setIsImageHovering(true)}
                    onMouseLeave={() => setIsImageHovering(false)}
                  >
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                      </div>
                    )}
                    {isImageHovering && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center pointer-events-none">
                        <ChevronDown className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-dark-100 rounded-md shadow-lg z-20 border border-gray-200 dark:border-dark-300">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-200 flex items-center"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Change Photo
                        </button>
                        <button
                          onClick={handleViewProfile}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-200 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                
                {/* Edit Profile Title and Step */}
                <div className="pb-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Step {step} of 3</p>
                </div>
              </div>

              {/* Right side: Close Button */}
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress indicator */}
            <div className="px-8 py-4 flex items-center space-x-2">
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                      step === i
                        ? 'bg-[#f26722] text-white'
                        : step > i
                        ? 'bg-[#f26722]/20 text-[#f26722]'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step > i ? <Check className="h-4 w-4" /> : i}
                  </div>
                  {i < 3 && (
                    <div
                      className={`h-1 flex-1 ${
                        step > i ? 'bg-[#f26722]' : 'bg-gray-100 dark:bg-dark-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                    <div className="space-y-4">
                      {/* Name and Role in a row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:border-transparent bg-white dark:bg-dark-200 text-gray-900 dark:text-white"
                            placeholder="Enter your name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                            Role
                          </label>
                          <p className="w-full px-3 py-2 border border-gray-200 dark:border-dark-600 bg-gray-100 dark:bg-dark-800 rounded-md text-gray-700 dark:text-gray-400">
                            {user?.user_metadata?.role || 'Not Assigned'} 
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Your role is assigned by an administrator.</p>
                        </div>
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm bg-gray-50 dark:bg-dark-200 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Details</h3>
                    <div className="space-y-4">
                      {/* Bio */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:border-transparent bg-white dark:bg-dark-200 text-gray-900 dark:text-white min-h-[100px]"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      {/* Division and Birthday in a row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                            NETA Division
                          </label>
                          <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:border-transparent bg-white dark:bg-dark-200 text-gray-900 dark:text-white"
                          >
                            <option value="">Select a division</option>
                            {divisions.map((div) => (
                              <option key={div} value={div}>{div}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                            Birthday
                          </label>
                          <input
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f26722] focus:border-transparent bg-white dark:bg-dark-200 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Submit</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-dark-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Profile Summary</h4>
                        <dl className="space-y-2">
                          <div className="flex justify-between">
                            <dt className="text-gray-500 dark:text-gray-400">Name:</dt>
                            <dd className="text-gray-900 dark:text-white">{name || 'Not set'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500 dark:text-gray-400">Role:</dt>
                            <dd className="text-gray-900 dark:text-white">{user?.user_metadata?.role || 'Not Assigned'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500 dark:text-gray-400">Division:</dt>
                            <dd className="text-gray-900 dark:text-white">{division || 'Not set'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500 dark:text-gray-400">Birthday:</dt>
                            <dd className="text-gray-900 dark:text-white">{birthday || 'Not set'}</dd>
                          </div>
                          {bio && (
                            <div className="flex flex-col space-y-1">
                              <dt className="text-gray-500 dark:text-gray-400">Bio:</dt>
                              <dd className="text-gray-900 dark:text-white text-sm">{bio}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              <div>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="px-4 py-2 flex items-center"
                  >
                    <span className="flex items-center">
                      <ChevronLeft className="mr-2 h-4 w-4" />Back
                    </span>
                  </Button>
                )}
              </div>

              <div>
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-[#f26722] hover:bg-[#f26722]/90 text-white px-4 py-2 flex items-center justify-center min-w-[120px]"
                  >
                    <span className="flex items-center">
                      Continue<ChevronRight className="ml-2 h-4 w-4" />
                    </span>
                  </Button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="px-4 py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-[#f26722] hover:bg-[#f26722]/90 text-white px-4 py-2 min-w-[100px]"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" />
                          Saving...
                        </div>
                      ) : showSuccess ? (
                        <div className="flex items-center">
                          <Check className="mr-2 h-4 w-4" />
                          Saved!
                        </div>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Cropping Modal */}
      <AnimatePresence>
        {isCropping && imgSrc && (
          <motion.div 
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCropBackdropClick}
          >
            <div 
              className="w-full max-w-4xl bg-white dark:bg-dark-100 rounded-lg shadow-xl p-6 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Adjust Cover Photo</h3>
              <div className="flex-grow overflow-auto mb-4 flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={COVER_ASPECT}
                  minWidth={100} // Example min dimensions
                  minHeight={100 / COVER_ASPECT}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me" 
                    src={imgSrc}
                    onLoad={onImageLoad}
                    style={{ maxHeight: '60vh', objectFit: 'contain' }} 
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-300">
                <Button variant="outline" onClick={() => setIsCropping(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleFitImage} 
                  disabled={isSubmitting}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-dark-200 dark:hover:bg-dark-300 dark:text-white"
                >
                  Fit Image (No Crop)
                </Button>
                <Button 
                  onClick={handleCropConfirm} 
                  disabled={!completedCrop || isSubmitting} 
                  className="bg-[#f26722] hover:bg-[#f26722]/90 text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Cropped Image'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile View Modal */}
      {showProfileView && (
        <ProfileView 
          isOpen={showProfileView} 
          onClose={() => setShowProfileView(false)} 
        />
      )}
    </>
  );
}; 