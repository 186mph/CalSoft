-- Create user_shortcuts table in common schema to store customizable shortcuts
CREATE TABLE IF NOT EXISTS common.user_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT, -- Icon identifier for the shortcut
  position INT NOT NULL DEFAULT 0, -- For ordering shortcuts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_shortcuts_user FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies to protect user shortcuts
ALTER TABLE common.user_shortcuts ENABLE ROW LEVEL SECURITY;

-- Allow users to manage only their own shortcuts
CREATE POLICY "Users can manage their own shortcuts" 
ON common.user_shortcuts
FOR ALL  
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions to the new table
GRANT ALL ON common.user_shortcuts TO authenticated, service_role;

-- Create a function to manage shortcut positions when deleting
CREATE OR REPLACE FUNCTION common.update_shortcuts_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Reorder remaining shortcuts to maintain consistent positions
  UPDATE common.user_shortcuts
  SET position = position - 1
  WHERE user_id = OLD.user_id
    AND position > OLD.position;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function on shortcut deletion
CREATE TRIGGER tr_update_shortcuts_position
AFTER DELETE ON common.user_shortcuts
FOR EACH ROW
EXECUTE FUNCTION common.update_shortcuts_position(); 