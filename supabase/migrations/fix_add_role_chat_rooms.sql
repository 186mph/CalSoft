-- Insert role-specific chat rooms without using ON CONFLICT
-- Instead check if they exist first and only insert if they don't

DO $$
DECLARE
  rooms TEXT[] := ARRAY['NETA Technicians', 'Lab Technicians', 'HR', 'Office', 'Sales', 'Engineering', 'Admin', 'General'];
  descriptions TEXT[] := ARRAY[
    'Chat room for NETA Technicians', 
    'Chat room for Lab Technicians', 
    'Chat room for HR Representatives', 
    'Chat room for Office Admins', 
    'Chat room for Sales Representatives', 
    'Chat room for Engineers', 
    'Chat room for Administrators',
    'Chat room for all employees'
  ];
  roles_access TEXT[] := ARRAY[
    'NETA Technician', 
    'Lab Technician', 
    'HR Rep', 
    'Office Admin', 
    'Sales Representative', 
    'Engineer', 
    'Admin',
    'All'
  ];
  room_exists BOOLEAN;
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(rooms, 1) LOOP
    -- Check if the room already exists
    SELECT EXISTS(
      SELECT 1 FROM common.chat_rooms WHERE name = rooms[i]
    ) INTO room_exists;
    
    -- If it doesn't exist, insert it
    IF NOT room_exists THEN
      INSERT INTO common.chat_rooms (name, description, role_access)
      VALUES (rooms[i], descriptions[i], roles_access[i]);
      RAISE NOTICE 'Inserted chat room: %', rooms[i];
    ELSE
      -- Update the role access settings to ensure they're correct
      UPDATE common.chat_rooms
      SET role_access = roles_access[i],
          description = descriptions[i]
      WHERE name = rooms[i];
      RAISE NOTICE 'Updated chat room: %', rooms[i];
    END IF;
  END LOOP;
END
$$; 