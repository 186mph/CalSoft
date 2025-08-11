import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ChatRoom, ChatMessage } from '@/types/chat';

export function useChat() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbSetupComplete, setDbSetupComplete] = useState<boolean | null>(null);

  // Computed messages for the current room only
  const messages = useMemo(() => {
    if (!currentRoom) return [];
    return messagesMap[currentRoom.id] || [];
  }, [messagesMap, currentRoom]);

  // Helper to update messages for a specific room
  const updateRoomMessages = useCallback((roomId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessagesMap(prev => ({
      ...prev,
      [roomId]: updater(prev[roomId] || [])
    }));
  }, []);

  // Check if the chat database setup is complete
  const checkDatabaseSetup = async () => {
    try {
      // Try to call the get_user_chat_rooms function
      const { data, error: rpcError } = await supabase.schema('common').rpc('get_user_chat_rooms');
      
      if (rpcError) {
        console.error("Database setup check failed - RPC error:", rpcError);
        setDbSetupComplete(false);
        setError(`The chat system is not properly set up. Please navigate to /chat-debug for more information. Error: ${rpcError.message}`);
        return false;
      }
      
      setDbSetupComplete(true);
      return true;
    } catch (err) {
      console.error("Database setup check failed:", err);
      setDbSetupComplete(false);
      setError('The chat system is not properly set up. Please navigate to /chat-debug for more information.');
      return false;
    }
  };

  // Fetch accessible chat rooms for the current user
  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check database setup first if we haven't done so already
      if (dbSetupComplete === null) {
        const isSetupComplete = await checkDatabaseSetup();
        if (!isSetupComplete) {
          setLoading(false);
          return;
        }
      }
      
      console.log("Fetching chat rooms for user:", user?.id);
      const { data, error } = await supabase.schema('common').rpc('get_user_chat_rooms');
      
      if (error) {
        console.error("Error fetching chat rooms:", error);
        throw error;
      }
      
      console.log("Chat rooms data received:", data);
      setChatRooms(data as ChatRoom[]);
      
      // Set the first room as current if none is selected
      if (!currentRoom && data.length > 0) {
        setCurrentRoom(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching chat rooms:', err);
      setError(`Failed to load chat rooms: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mark a room's messages as read
  const markRoomAsRead = async (roomId: string) => {
    try {
      if (!user) return;
      
      // Call the RPC function to mark messages as read
      const { error } = await supabase.schema('common').rpc('mark_room_messages_read', { p_room_id: roomId });
      
      if (error) {
        console.error('Error marking room as read:', error);
        return false;
      }
      
      // Update local state to show 0 unread messages
      setChatRooms(prev => 
        prev.map(room => 
          room.id === roomId 
            ? { ...room, unread_count: 0 } 
            : room
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error in markRoomAsRead:', err);
      return false;
    }
  };

  // Fetch messages for the current room
  const fetchMessages = async (roomId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Mark as read before fetching messages
      await supabase.schema('common').rpc('mark_room_messages_read', { p_room_id: roomId });
      
      // Fetch messages
      const { data: messageData, error: messageError } = await supabase
        .schema('common').from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (messageError) throw messageError;
      
      // If we have messages, fetch user data efficiently
      if (messageData && messageData.length > 0) {
        // Get unique user IDs from messages
        const uniqueUserIds = [...new Set(messageData.map(msg => msg.user_id))];
        
        // Fetch all user profiles in one query
        const { data: userProfiles, error: profilesError } = await supabase
          .schema('common')
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', uniqueUserIds);
        
        // Create a map for quick lookup
        const userProfileMap = new Map();
        if (userProfiles) {
          userProfiles.forEach(profile => {
            userProfileMap.set(profile.id, profile);
          });
        }
        
        // Process messages with user data
        const processedMessages = messageData.map(message => {
          const userProfile = userProfileMap.get(message.user_id);
          
          // For current user, use the user context data
          if (user && message.user_id === user.id) {
            return {
              ...message,
              user: {
                email: user.email || '',
                name: user.user_metadata?.name || user.user_metadata?.full_name || user.user_metadata?.username || user.email || 'You',
                profileImage: user.user_metadata?.profileImage || user.user_metadata?.avatar_url || null
              }
            };
          }
          
          // For other users, use profile data or fallback
          return {
            ...message,
            user: {
              email: userProfile?.email || 'unknown@example.com',
              name: userProfile?.full_name || 'Unknown User',
              profileImage: userProfile?.avatar_url || null
            }
          };
        });
        
        // Update messages for this room
        updateRoomMessages(roomId, () => processedMessages);
      } else {
        // No messages, set empty array
        updateRoomMessages(roomId, () => []);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(`Failed to load messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get user details with appropriate fallbacks
  const getUserDetails = (userId: string, defaultName: string = 'Unknown User') => {
    // Return default values with a generated avatar based on name
    return {
      name: defaultName,
      email: 'unknown',
      profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=4f46e5&color=fff&size=128`
    };
  };

  // Helper function to get a fallback profile image from name
  const getFallbackPhotoFromName = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=128`;
  };

  // Function to send a message
  const sendMessage = async (content: string) => {
    if (!user || !currentRoom || !content.trim()) return;
    
    const roomId = currentRoom.id;
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    
    setSendingMessage(true);
    setError(null);
    
    try {
      // Create an optimistic message with user details
      const optimisticMessage: ChatMessage = {
        id: tempId,
        room_id: roomId,
        user_id: user.id,
        content: content.trim(),
        created_at: now,
        updated_at: now,
        user: {
          email: user.email || '',
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.user_metadata?.username || user.email || 'You',
          profileImage: user.user_metadata?.profileImage || user.user_metadata?.avatar_url || null
        }
      };
      
      // Add message to THIS SPECIFIC room's messages (optimistic update)
      updateRoomMessages(roomId, prev => [...prev, optimisticMessage]);
      
      // Also update chat rooms with this new message
      setChatRooms(prev => 
        prev.map(room => {
          if (room.id === roomId) {
            return {
              ...room,
              last_message: content.trim(),
              last_message_time: now,
              unread_count: 0
            };
          }
          return room;
        })
      );
      
      // Insert the message into the database
      const { data, error } = await supabase
        .schema('common').from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: content.trim()
        })
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        // Remove the optimistic message on error
        updateRoomMessages(roomId, prev => 
          prev.filter(message => message.id !== tempId)
        );
        setError(error.message);
        return;
      }
      
      // Note: We don't need to update the messages array here
      // The subscription will handle that for us automatically
      console.log('Message sent successfully');
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Unknown error sending message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Set up real-time subscriptions for new messages when current room changes
  useEffect(() => {
    if (!user || !currentRoom) return;
    
    console.log(`Setting up message subscription for room: ${currentRoom.name} (${currentRoom.id})`);
    
    // Subscribe to new messages for the CURRENT room only
    const messagesSubscription = supabase
      .channel(`chat-messages-room-${currentRoom.id}`)
      .on('postgres_changes', {
          event: 'INSERT', 
          schema: 'common', 
          table: 'chat_messages',
        filter: `room_id=eq.${currentRoom.id}` // Only listen for messages in this room
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          const roomId = newMessage.room_id;
          
          // Skip messages that don't belong to the current room (double-check)
          if (roomId !== currentRoom.id) {
            console.warn('Got message for room', roomId, 'but current room is', currentRoom.id);
            return;
          }
          
          // Update chat rooms with latest message
          setChatRooms(prev => 
            prev.map(room => {
              if (room.id === roomId) {
                return {
                  ...room,
                  last_message: newMessage.content,
                  last_message_time: newMessage.created_at,
                  unread_count: 0 // Always 0 since this is the current room
                };
              }
              return room;
            })
          );
          
          // Check if we already have this message in our local state
          // (it might be a message we sent and already added optimistically)
          const roomMessages = messagesMap[roomId] || [];
          const messageExists = roomMessages.some(m => 
            (m.id === newMessage.id) || 
            (m.user_id === newMessage.user_id && 
             m.content === newMessage.content && 
             Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000)
          );
          
          if (!messageExists) {
            // If it's not one of our optimistic messages, add it now
            // For new messages, immediately fetch user details instead of using placeholder
            if (user?.id === newMessage.user_id) {
              // If it's the current user, use their data from auth context
              const messageWithUser = {
                ...newMessage,
                user: {
                  email: user.email || '',
                  name: user.user_metadata?.name || user.user_metadata?.full_name || user.user_metadata?.username || user.email || 'You',
                  profileImage: user.user_metadata?.profileImage || user.user_metadata?.avatar_url || null
                }
              };
              
              updateRoomMessages(roomId, prev => [...prev, messageWithUser]);
            } else {
              // For other users, immediately fetch their details
              // PROFILES TABLE FIRST - prioritize the most reliable approach
              supabase
              .schema('common').from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('id', newMessage.user_id)
                .single()
                .then(({ data: profileData, error: profileError }) => {
                  if (!profileError && profileData) {
                    console.log('RT message: Got user details from profiles for', newMessage.user_id, ':', profileData);
                    const messageWithUser = {
                      ...newMessage,
                      user: {
                        email: profileData.email || 'unknown',
                        name: profileData.full_name || profileData.email || `User ${newMessage.user_id.substring(0, 6)}`,
                        profileImage: profileData.avatar_url || null
                      }
                    };
                    updateRoomMessages(roomId, prev => [...prev, messageWithUser]);
                  } else {
                    console.warn('RT message: Profiles table failed, trying RPC:', profileError?.message);
                    
                    // Second attempt: try RPC method
                    supabase
                    .schema('common')
                      .rpc('get_user_details', { user_id: newMessage.user_id })
                      .then(({ data: rpcData, error: rpcError }) => {
                        if (!rpcError && rpcData && rpcData.length > 0) {
                          console.log('RT message: Got user details from RPC for', newMessage.user_id, ':', rpcData[0]);
                          const messageWithUser = {
                            ...newMessage,
                            user: {
                              email: rpcData[0].email || '',
                              name: rpcData[0].name || rpcData[0].email || `User ${newMessage.user_id.substring(0, 6)}`,
                              profileImage: rpcData[0].profile_image || null
                            }
                          };
                          
                          updateRoomMessages(roomId, prev => [...prev, messageWithUser]);
                        } else {
                          console.error('RT message: All user data retrieval methods failed for:', newMessage.user_id);
                          
                          // Generate a fallback user profile with generated avatar
                          const userName = `User ${newMessage.user_id.substring(0, 6)}`;
                          const messageWithUser = {
                            ...newMessage,
                            user: {
                              email: 'unknown',
                              name: userName,
                              profileImage: getFallbackPhotoFromName(userName)
                            }
                          };
                          
                          updateRoomMessages(roomId, prev => [...prev, messageWithUser]);
                        }
                      });
                  }
                });
            }
          }
        }
      )
      .subscribe();
    
    // Cleanup subscription
    return () => {
      console.log(`Cleaning up message subscription for room: ${currentRoom.name}`);
      messagesSubscription.unsubscribe();
    };
  }, [user, currentRoom?.id, messagesMap, updateRoomMessages]);

  // Separate effect for chat rooms subscription - this one doesn't change with currentRoom
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to changes in chat rooms
    const roomsSubscription = supabase
      .channel('chat-rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'common', table: 'chat_rooms' },
        () => {
          fetchChatRooms();
        }
      )
      .subscribe();
    
    // Fetch initial data
    fetchChatRooms();
    
    // Cleanup subscription
    return () => {
      roomsSubscription.unsubscribe();
    };
  }, [user]);
  
  // When currentRoom changes, fetch messages
  useEffect(() => {
    if (currentRoom) {
      // We don't need to clear messages anymore - they're separated by room
      // We only need to fetch messages for the room if we don't have them yet
      if (!messagesMap[currentRoom.id] || messagesMap[currentRoom.id].length === 0) {
        fetchMessages(currentRoom.id);
      }
    }
  }, [currentRoom?.id, messagesMap]);
  
  // Preload profile information for all chat participants
  const preloadUserProfiles = async (roomId: string) => {
    try {
      console.log("Preloading user profiles for room:", roomId);
      
      // Get all distinct user_ids from messages in this room
      const { data: participants, error: participantsError } = await supabase
        .schema('common')
        .from('chat_messages')
        .select('user_id')
        .eq('room_id', roomId);
      
      if (participantsError) {
        console.error("Error fetching chat participants:", participantsError);
        return;
      }
      
      console.log("Found participants:", participants);
      
      // Fetch profile information for each participant
      if (participants && participants.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(participants.map(p => p.user_id))];
        
        // First try to get all profiles at once
        const { data: profiles, error: profilesErrors } = await supabase
          .schema('common')
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
          
        if (!profilesErrors && profiles && profiles.length > 0) {
          console.log("Preloaded profiles:", profiles);
          
          // Map profiles to user IDs for quick lookup
          const profileMap: Record<string, any> = {};
          profiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
          
          // Now update the messages with profile information
          updateRoomMessages(roomId, prevMessages => {
            return prevMessages.map(message => {
              // If message already has user info, keep it
              if (message.user?.name && message.user.name !== `User ${message.user_id.substring(0, 6)}`) {
                return message;
              }
              
              // If we have profile info for this user, use it
              const profile = profileMap[message.user_id];
              if (profile) {
                const name = profile.full_name || profile.email || `User ${message.user_id.substring(0, 6)}`;
                return {
                  ...message,
                  user: {
                    email: profile.email || 'unknown',
                    name: name,
                    profileImage: profile.avatar_url || getFallbackPhotoFromName(name)
                  }
                };
              }
              
              // Generate a fallback profile with an avatar
              const defaultName = `User ${message.user_id.substring(0, 6)}`;
              return {
                ...message,
                user: {
                  email: 'unknown',
                  name: defaultName,
                  profileImage: getFallbackPhotoFromName(defaultName)
                }
              };
            });
          });
        }
      }
    } catch (err) {
      console.error("Error preloading user profiles:", err);
    }
  };

  return {
    chatRooms,
    currentRoom,
    messages,
    loading,
    sendingMessage,
    error,
    setCurrentRoom,
    sendMessage,
    markRoomAsRead,
    refreshRooms: fetchChatRooms,
    refreshMessages: () => currentRoom && fetchMessages(currentRoom.id),
    preloadUserProfiles
  };
}