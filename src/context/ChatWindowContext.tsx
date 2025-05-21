import React, { createContext, useState, useContext, useEffect } from 'react';

interface ChatWindowContextType {
  openChatRooms: string[];
  openChatRoom: (roomId: string) => void;
  closeChatRoom: (roomId: string) => void;
  isRoomOpen: (roomId: string) => boolean;
}

const ChatWindowContext = createContext<ChatWindowContextType | undefined>(undefined);

export const ChatWindowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use localStorage to persist open chat rooms across page refreshes
  const [openChatRooms, setOpenChatRooms] = useState<string[]>(() => {
    // Initialize from localStorage if available
    const savedRooms = localStorage.getItem('openChatRooms');
    return savedRooms ? JSON.parse(savedRooms) : [];
  });

  // Save to localStorage whenever openChatRooms changes
  useEffect(() => {
    localStorage.setItem('openChatRooms', JSON.stringify(openChatRooms));
  }, [openChatRooms]);

  // Open a chat room
  const openChatRoom = (roomId: string) => {
    if (!openChatRooms.includes(roomId)) {
      setOpenChatRooms(prev => [...prev, roomId]);
    }
  };

  // Close a chat room
  const closeChatRoom = (roomId: string) => {
    setOpenChatRooms(prev => prev.filter(id => id !== roomId));
  };

  // Check if a room is open
  const isRoomOpen = (roomId: string) => {
    return openChatRooms.includes(roomId);
  };

  return (
    <ChatWindowContext.Provider
      value={{
        openChatRooms,
        openChatRoom,
        closeChatRoom,
        isRoomOpen
      }}
    >
      {children}
    </ChatWindowContext.Provider>
  );
};

// Custom hook to use the chat window context
export const useChatWindows = () => {
  const context = useContext(ChatWindowContext);
  if (context === undefined) {
    throw new Error('useChatWindows must be used within a ChatWindowProvider');
  }
  return context;
}; 