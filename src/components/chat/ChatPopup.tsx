import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/lib/AuthContext';
import { Send, X, ChevronLeft, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useNavigate } from 'react-router-dom';

interface ChatPopupProps {
  onClose: () => void;
}

const ChatPopup: React.FC<ChatPopupProps> = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    chatRooms,
    currentRoom,
    messages,
    loading,
    sendingMessage,
    setCurrentRoom,
    sendMessage,
    error
  } = useChat();
  
  const [messageText, setMessageText] = useState('');
  const [showRoomList, setShowRoomList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add listener when the popup is open
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Clean up listener when the popup is closed or component unmounts
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !messageText.trim() || sendingMessage) return;
    
    // Send the message (no need to pass roomId, it uses currentRoom internally)
    await sendMessage(messageText.trim());
    
    // Always clear the message input after sending
    setMessageText('');
  };
  
  const handleRoomSelect = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (room) {
      setCurrentRoom(room);
      setShowRoomList(false);
    }
  };
  
  const goBackToRooms = () => {
    setShowRoomList(true);
  };
  
  // Helper function to get a fallback profile image from name
  const getFallbackPhotoFromName = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=128`;
  };
  
  // Get correct user display info for messages
  const getUserDisplayInfo = (message: any) => {
    if (user && message.user_id === user.id) {
      const name = user.user_metadata?.name || user.email || 'You';
      return {
        name: name,
        profileImage: user.user_metadata?.profileImage || user.user_metadata?.avatar_url || getFallbackPhotoFromName(name)
      };
    }
    
    // Use message user data with fallback to generated avatar
    const name = message.user?.name || message.user?.email || `User ${message.user_id.substring(0, 6)}`;
    return {
      name: name,
      profileImage: message.user?.profileImage || getFallbackPhotoFromName(name)
    };
  };
  
  return (
    <div 
      ref={popupRef}
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white dark:bg-dark-150 shadow-lg rounded-lg border border-gray-200 dark:border-dark-300 overflow-hidden flex flex-col" 
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        {!showRoomList && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-1 mr-2"
            onClick={goBackToRooms}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1 truncate">
          {showRoomList ? 'Chat Rooms' : currentRoom?.name || 'Chat'}
        </h3>
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-1" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {showRoomList ? (
        // Chat rooms list
        <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-gray-950">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading chat rooms...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 dark:text-red-400 flex flex-col items-center">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Error loading chat rooms</p>
              <p className="text-xs mt-1">{error}</p>
              {error.includes('not properly set up') && (
                <Button 
                  className="mt-3" 
                  variant="outline" 
                  onClick={() => {
                    navigate('/chat-debug');
                    onClose();
                  }}
                >
                  Go to Chat Diagnostics
                </Button>
              )}
              <Button 
                className="mt-3" 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Reload page
              </Button>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>No chat rooms available for your role.</p>
              <p className="text-xs mt-1">The migration may need to be applied.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chatRooms.map(room => (
                <div
                  key={room.id}
                  className={`
                    flex items-center p-2 rounded-md cursor-pointer
                    ${room.unread_count > 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-100 dark:hover:bg-dark-300'}
                  `}
                  onClick={() => handleRoomSelect(room.id)}
                >
                  {/* Room info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-white truncate">{room.name}</span>
                      {room.unread_count > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs font-medium text-white">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {room.last_message}
                      </p>
                    )}
                    {room.last_message_time && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(room.last_message_time), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Chat messages view
        <>
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-950"
            style={{ maxHeight: 'calc(100vh - 240px)' }}
          >
            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message, index) => {
                const isCurrentUser = message.user_id === user?.id;
                const timeGap = index > 0 && 
                  (new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000);
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : "flex-row"} ${timeGap ? "mt-4" : "mt-1"}`}
                  >
                    {/* User avatar */}
                    <div className="flex-shrink-0 mt-1">
                      {/* Get user display info from our helper function */}
                      {(() => {
                        const userInfo = getUserDisplayInfo(message);
                        return userInfo.profileImage ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={userInfo.profileImage} 
                              alt={userInfo.name || "User"} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {userInfo.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Message content */}
                    <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"}`}>
                      {/* Sender name (only for other users) */}
                      {!isCurrentUser && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1 mb-1">
                          {getUserDisplayInfo(message).name}
                        </span>
                      )}
                      
                      <div className="flex flex-col">
                        <div
                          className={`
                            px-3 py-2 rounded-lg
                            ${isCurrentUser 
                              ? 'bg-[#f26722] text-white rounded-br-none' 
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
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 border-0"
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || sendingMessage}
                className="rounded-full h-9 w-9 p-2 bg-[#f26722] hover:bg-[#f26722]/90 text-white"
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

export default ChatPopup; 