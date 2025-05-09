import React from 'react';
import { useChatWindows } from '../../context/ChatWindowContext';
import FloatingChatWindow from './FloatingChatWindow';

const ChatWindowManager: React.FC = () => {
  const { openChatRooms, closeChatRoom } = useChatWindows();
  
  return (
    <>
      {openChatRooms.map((roomId, index) => (
        <FloatingChatWindow
          key={roomId}
          roomId={roomId}
          onClose={() => closeChatRoom(roomId)}
          initialPosition={{ x: window.innerWidth - 420 - (index * 30), y: 100 + (index * 30) }}
        />
      ))}
    </>
  );
};

export default ChatWindowManager; 