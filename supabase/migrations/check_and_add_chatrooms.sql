-- Check if any chat rooms exist
DO $$
DECLARE
    room_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO room_count FROM common.chat_rooms;
    
    -- If no chat rooms exist, insert the default ones
    IF room_count = 0 THEN
        INSERT INTO common.chat_rooms (name, description, role_access)
        VALUES 
          ('General', 'Chat room for all employees', 'All'),
          ('NETA Technicians', 'Chat room for NETA Technicians', 'NETA Technician'),
          ('Lab Technicians', 'Chat room for Lab Technicians', 'Lab Technician'),
          ('HR', 'Chat room for HR Representatives', 'HR Rep'),
          ('Office', 'Chat room for Office Admins', 'Office Admin'),
          ('Sales', 'Chat room for Sales Representatives', 'Sales Representative'),
          ('Engineering', 'Chat room for Engineers', 'Engineer'),
          ('Admin', 'Chat room for Administrators', 'Admin');
          
        RAISE NOTICE 'Default chat rooms added.';
    ELSE
        RAISE NOTICE 'Chat rooms already exist. Count: %', room_count;
    END IF;
END $$; 