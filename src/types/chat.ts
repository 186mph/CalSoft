export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  role_access: string;
  unread_count: number;
  last_message: string | null;
  last_message_time: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  user?: {
    email: string;
    name: string;
    profileImage: string | null;
  };
}

export interface ChatRoomStatus {
  user_id: string;
  room_id: string;
  last_read_message_id: string | null;
  last_visit_time: string;
} 