import { supabase } from '../lib/supabase';

export interface Shortcut {
  id?: string;
  user_id: string;
  title: string;
  url: string;
  icon?: string;
  position: number;
}

export const ShortcutService = {
  /**
   * Get all shortcuts for the current user
   */
  async getUserShortcuts(userId: string): Promise<Shortcut[]> {
    console.log('ShortcutService - Getting shortcuts for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('user_shortcuts')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching shortcuts:', error);
        throw error;
      }

      console.log('ShortcutService - Retrieved shortcuts:', data);
      return data || [];
    } catch (err) {
      console.error('Error in getUserShortcuts:', err);
      throw err;
    }
  },

  /**
   * Create a new shortcut
   */
  async createShortcut(shortcut: Omit<Shortcut, 'id' | 'position'>): Promise<Shortcut> {
    console.log('ShortcutService - Creating shortcut:', shortcut);
    
    try {
      // Get the highest position to place new shortcut at the end
      const { data: existingShortcuts, error: countError } = await supabase
        .from('user_shortcuts')
        .select('position')
        .eq('user_id', shortcut.user_id)
        .order('position', { ascending: false })
        .limit(1);

      if (countError) {
        console.error('Error getting shortcut count:', countError);
        throw countError;
      }

      const position = existingShortcuts && existingShortcuts.length > 0 
        ? existingShortcuts[0].position + 1 
        : 0;

      const { data, error } = await supabase
        .from('user_shortcuts')
        .insert([{ ...shortcut, position }])
        .select()
        .single();

      if (error) {
        console.error('Error creating shortcut:', error);
        throw error;
      }

      console.log('ShortcutService - Created shortcut:', data);
      return data;
    } catch (err) {
      console.error('Error in createShortcut:', err);
      throw err;
    }
  },

  /**
   * Update an existing shortcut
   */
  async updateShortcut(id: string, shortcut: Partial<Omit<Shortcut, 'id' | 'user_id'>>): Promise<Shortcut> {
    console.log('ShortcutService - Updating shortcut:', id, shortcut);
    
    try {
      const { data, error } = await supabase
        .from('user_shortcuts')
        .update({ ...shortcut, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating shortcut:', error);
        throw error;
      }

      console.log('ShortcutService - Updated shortcut:', data);
      return data;
    } catch (err) {
      console.error('Error in updateShortcut:', err);
      throw err;
    }
  },

  /**
   * Delete a shortcut
   */
  async deleteShortcut(id: string): Promise<void> {
    console.log('ShortcutService - Deleting shortcut:', id);
    
    try {
      const { error } = await supabase
        .from('user_shortcuts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shortcut:', error);
        throw error;
      }

      console.log('ShortcutService - Deleted shortcut:', id);
    } catch (err) {
      console.error('Error in deleteShortcut:', err);
      throw err;
    }
  },

  /**
   * Reorder shortcuts
   * @param userId The user ID
   * @param shortcutIds Array of shortcut IDs in the new order
   */
  async reorderShortcuts(userId: string, shortcutIds: string[]): Promise<void> {
    console.log('ShortcutService - Reordering shortcuts for user:', userId, shortcutIds);
    
    try {
      // Start a batch update
      const updates = shortcutIds.map((id, index) => {
        return supabase
          .from('user_shortcuts')
          .update({ position: index, updated_at: new Date() })
          .eq('id', id)
          .eq('user_id', userId);
      });

      // Execute all updates in parallel
      await Promise.all(updates);
      console.log('ShortcutService - Reordered shortcuts successfully');
    } catch (err) {
      console.error('Error in reorderShortcuts:', err);
      throw err;
    }
  }
}; 