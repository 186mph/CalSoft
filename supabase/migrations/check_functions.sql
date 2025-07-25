-- Check if the chat functions exist
SELECT 
  routine_name, 
  routine_schema
FROM 
  information_schema.routines 
WHERE 
  routine_name = 'get_user_chat_rooms' OR
  routine_name = 'mark_room_messages_read' OR
  routine_name = 'get_unread_message_count'; 