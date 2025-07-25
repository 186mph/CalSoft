-- Check what rooms exist in the chat_rooms table
SELECT id, name, description, role_access 
FROM common.chat_rooms;

-- Check if the INSERT statement actually worked
-- Re-run the INSERT with modified conflict clause to include name in the conflict detection
INSERT INTO common.chat_rooms (name, description, role_access)
VALUES 
  ('NETA Technicians', 'Chat room for NETA Technicians', 'NETA Technician'),
  ('Lab Technicians', 'Chat room for Lab Technicians', 'Lab Technician'),
  ('HR', 'Chat room for HR Representatives', 'HR Rep'),
  ('Office', 'Chat room for Office Admins', 'Office Admin'),
  ('Sales', 'Chat room for Sales Representatives', 'Sales Representative'),
  ('Engineering', 'Chat room for Engineers', 'Engineer'),
  ('Admin', 'Chat room for Administrators', 'Admin')
ON CONFLICT (name) DO NOTHING
RETURNING id, name, role_access; 