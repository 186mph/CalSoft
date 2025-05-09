import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { useChat } from '@/hooks/useChat';
import { useChatWindows } from '../../context/ChatWindowContext';

export const ChatButton: React.FC = () => {
  const [showChatList, setShowChatList] = useState(false);
  const chatButtonRef = useRef<HTMLDivElement>(null);
  const { chatRooms } = useChat();
  const { openChatRoom } = useChatWindows();
  
  // Calculate total unread messages
  const totalUnreadCount = chatRooms.reduce((sum, room) => sum + room.unread_count, 0);
  
  // Close the chat popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatButtonRef.current && !chatButtonRef.current.contains(event.target as Node)) {
        setShowChatList(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Open a chat room and hide the menu
  const handleOpenChatRoom = (roomId: string) => {
    openChatRoom(roomId);
    setShowChatList(false);
  };
  
  return (
    <div className="relative mr-3" ref={chatButtonRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowChatList(!showChatList)}
        className="rounded-full w-10 h-10 hover:bg-gray-100 dark:hover:bg-dark-50 relative overflow-visible"
        aria-label="Open chat"
      >
        <MessageSquare className="h-5 w-5 text-gray-600 dark:text-dark-400" />
        
        {/* Unread badge */}
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f26722] text-[10px] font-medium text-white ring-2 ring-white dark:ring-dark-150">
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
      </Button>
      
      {/* Chat rooms popup */}
      {showChatList && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white dark:bg-dark-150 shadow-lg rounded-lg border border-gray-200 dark:border-dark-300 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-300 bg-gray-50 dark:bg-dark-200">
            <h3 className="font-medium text-gray-800 dark:text-white flex-1 truncate">
              Chat Rooms
            </h3>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1" 
              onClick={() => setShowChatList(false)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {chatRooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <p>No chat rooms available for your role.</p>
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
                    onClick={() => handleOpenChatRoom(room.id)}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 