-- Insert role-specific chat rooms
INSERT INTO common.chat_rooms (name, description, role_access)
VALUES 
  ('NETA Technicians', 'Chat room for NETA Technicians', 'NETA Technician'),
  ('Lab Technicians', 'Chat room for Lab Technicians', 'Lab Technician'),
  ('HR', 'Chat room for HR Representatives', 'HR Rep'),
  ('Office', 'Chat room for Office Admins', 'Office Admin'),
  ('Sales', 'Chat room for Sales Representatives', 'Sales Representative'),
  ('Engineering', 'Chat room for Engineers', 'Engineer'),
  ('Admin', 'Chat room for Administrators', 'Admin')
ON CONFLICT (name) DO NOTHING; 