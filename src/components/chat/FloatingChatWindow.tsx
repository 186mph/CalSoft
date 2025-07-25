import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/lib/AuthContext';
import { Send, X, Minimize, Maximize, User, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '@/lib/supabase';
import { ProfileView } from '../profile/ProfileView';

interface Position {
  x: number;
  y: number;
}

interface FloatingChatWindowProps {
  roomId: string;
  onClose: () => void;
  initialPosition?: Position;
}

const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({ 
  roomId, 
  onClose, 
  initialPosition = { x: window.innerWidth - 420, y: 100 } 
}) => {
  const { user } = useAuth();
  const {
    chatRooms,
    messages,
    loading,
    sendingMessage,
    sendMessage,
    markRoomAsRead,
    setCurrentRoom
  } = useChat();
  
  const [messageText, setMessageText] = useState('');
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
  const [showRetentionNotice, setShowRetentionNotice] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const dragRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentRoom = chatRooms.find(room => room.id === roomId);
  
  // Mark initial load as complete after first render
  useEffect(() => {
    // Set initialLoad to false after a short delay to prevent flash
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Save position to localStorage when it changes
  useEffect(() => {
    const savedPositions = JSON.parse(localStorage.getItem('chatWindowPositions') || '{}');
    savedPositions[roomId] = position;
    localStorage.setItem('chatWindowPositions', JSON.stringify(savedPositions));
  }, [position, roomId]);
  
  // Load position from localStorage on mount
  useEffect(() => {
    const savedPositions = JSON.parse(localStorage.getItem('chatWindowPositions') || '{}');
    if (savedPositions[roomId]) {
      setPosition(savedPositions[roomId]);
    }
  }, [roomId]);

  // Close profile popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowUserProfile(null);
      }
    };
    
    if (showUserProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserProfile]);

  // Mark messages as read when opening the chat and set the current room
  useEffect(() => {
    if (roomId && chatRooms.length > 0) {
      const room = chatRooms.find(r => r.id === roomId);
      if (room) {
        console.log(`Setting current room to: ${room.name} (${room.id})`);
        setCurrentRoom(room);
        markRoomAsRead(roomId);
      } else {
        console.warn(`Room with ID ${roomId} not found in available rooms`);
      }
    }
  }, [roomId, chatRooms, markRoomAsRead, setCurrentRoom]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);
  
  // Auto-hide the retention notice after 5 seconds
  useEffect(() => {
    if (showRetentionNotice) {
      const timer = setTimeout(() => {
        setShowRetentionNotice(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showRetentionNotice]);
  
  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Prevent dragging beyond screen boundaries
        const maxX = window.innerWidth - dragRef.current.offsetWidth;
        const maxY = window.innerHeight - dragRef.current.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: newX, y: newY });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the clicked element is a button or within a button
    const target = e.target as HTMLElement;
    const isButton = target.closest('button');
    
    // Only initiate drag if it's not a button click
    if (dragRef.current && !isButton) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      
      // Prevent text selection during dragging
      e.preventDefault();
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !messageText.trim() || sendingMessage) return;
    
    // Store the message text and clear the input immediately
    const messageToSend = messageText.trim();
    setMessageText('');
    
    // Focus the input after sending for quick follow-up messages
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Ensure we're in the correct room before sending
    const roomToSend = chatRooms.find(r => r.id === roomId);
    if (roomToSend && currentRoom?.id !== roomId) {
      console.log(`Switching current room to ${roomToSend.name} before sending message`);
      setCurrentRoom(roomToSend);
    }
    
    // Send the message
    await sendMessage(messageToSend);
  };
  
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleViewProfile = (userId: string) => {
    // Toggle profile view if same user clicked again
    if (showUserProfile === userId) {
      setShowUserProfile(null);
      return;
    }
    
    // Set the user ID to show profile for
    setShowUserProfile(userId);
    
    // No need to manually fetch the profile here - the ProfileView component handles this
  };
  
  // If the room doesn't exist yet or we're on initial load with no messages, don't show "Loading..."
  const shouldShowEmptyState = (!loading || !initialLoad) && messages.length === 0;
  
  if (!currentRoom) {
    return null;
  }
  
  return (
    <div 
      className="fixed z-50 bg-white dark:bg-dark-150 shadow-xl rounded-lg border border-gray-200 dark:border-dark-300 flex flex-col overflow-hidden"
      style={{ 
        width: '380px',
        height: isMinimized ? '48px' : '500px',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'height 0.3s ease-in-out'
      }}
    >
      {/* Header - Draggable area */}
      <div 
        ref={dragRef}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{currentRoom.name}</h2>
          
          {/* Small loading indicator in the header */}
          {loading && (
            <Loader2 className="h-3 w-3 inline-block animate-spin text-gray-400" />
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-1"
            onClick={toggleMinimize}
          >
            {isMinimized ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-1"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Chat content - Only show when not minimized */}
      {!isMinimized && (
        <>
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-950"
          >
            {/* Message retention notice */}
            {showRetentionNotice && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md text-xs text-blue-700 dark:text-blue-300 flex items-center mb-2 animate-fade-in-down">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>Messages are automatically deleted after 24 hours.</span>
                <button 
                  className="ml-auto text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => setShowRetentionNotice(false)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {/* Empty state - only shown when not loading or after initial load completed */}
            {shouldShowEmptyState && (
              <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                No messages yet. Start the conversation!
              </div>
            )}
            
            {/* Message list */}
            {messages.map((message, index) => {
              const isCurrentUser = message.user_id === user?.id;
              const timeGap = index > 0 && 
                (new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000);
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : "flex-row"} ${timeGap ? "mt-4" : "mt-1"}`}
                >
                  {/* User avatar */}
                  <div 
                    className="flex-shrink-0 mt-1"
                    onClick={() => handleViewProfile(message.user_id)}
                  >
                    {message.user?.profileImage ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer hover:opacity-80">
                        <img 
                          src={message.user.profileImage} 
                          alt={message.user.name || "User"} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {message.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Message content */}
                  <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"}`}>
                    {/* Sender name (only for other users) */}
                    {!isCurrentUser && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1 mb-1">
                        {message.user?.name || message.user?.email || `User ${message.user_id.substring(0, 6)}`}
                      </span>
                    )}
                    
                    <div className="flex flex-col">
                      <div
                        className={`
                          px-3 py-2 rounded-lg
                          ${isCurrentUser 
                            ? 'bg-accent-color text-white rounded-br-none' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'}
                        `}
                      >
                        {message.content}
                      </div>
                      
                      {/* Only show timestamp for the last message in a sequence */}
                      {(index === messages.length - 1 || messages[index + 1]?.user_id !== message.user_id || 
                        (new Date(messages[index + 1].created_at).getTime() - new Date(message.created_at).getTime() > 5 * 60 * 1000)) && (
                        <div
                          className={`
                            flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1
                            ${isCurrentUser ? "justify-end" : "justify-start"}
                          `}
                        >
                          <span>about {formatDistanceToNow(new Date(message.created_at), { addSuffix: false })} ago</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />

            {/* User Profile View */}
            {showUserProfile && (
              <ProfileView
                isOpen={true}
                onClose={() => setShowUserProfile(null)}
                userId={showUserProfile}
              />
            )}
          </div>
          
          {/* Message input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 border-0"
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || sendingMessage}
                className="rounded-full h-9 w-9 p-2 bg-accent-color hover:bg-accent-color/90 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default FloatingChatWindow; 