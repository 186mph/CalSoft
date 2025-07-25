import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { ShortcutService, Shortcut } from '@/services/ShortcutService';
import { ShortcutManager } from './ShortcutManager';
import { ShortcutManagerDndKit } from './ShortcutManagerDndKit';

export const ShortcutDisplay: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [useDndKit, setUseDndKit] = useState(true); // Use the DndKit version by default

  // Debug user info
  useEffect(() => {
    console.log('ShortcutDisplay - User:', user?.id);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadShortcuts();
    }
  }, [user]);

  // Debug manager open state
  useEffect(() => {
    console.log('ShortcutDisplay - Manager open state:', isOpen);
  }, [isOpen]);

  const loadShortcuts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await ShortcutService.getUserShortcuts(user.id);
      console.log('ShortcutDisplay - Loaded shortcuts:', data);
      setShortcuts(data);
    } catch (err) {
      console.error('Error loading shortcuts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShortcutClick = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  const openShortcutManager = () => {
    console.log('ShortcutDisplay - Opening manager');
    setIsOpen(true);
  };

  const closeShortcutManager = () => {
    console.log('ShortcutDisplay - Closing manager');
    setIsOpen(false);
    // Reload shortcuts after manager is closed
    loadShortcuts();
  };

  if (loading) {
    return (
      <div className="animate-pulse p-6 bg-gray-50 dark:bg-dark-100 rounded-xl">
        <div className="h-6 w-48 bg-gray-200 dark:bg-dark-200 rounded mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="h-16 bg-gray-200 dark:bg-dark-200 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  if (shortcuts.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-dark-100 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">My Shortcuts</h3>
          <div className="flex items-center space-x-2">
            {/* Fallback toggle button - only visible if there are drag errors */}
            {error && error.includes('drag') && (
              <button 
                onClick={() => setUseDndKit(!useDndKit)}
                className="text-xs text-gray-500 dark:text-gray-400 flex items-center"
                title="Switch drag and drop implementation"
              >
                <span>{useDndKit ? 'Try alternate drag and drop' : 'Try modern drag and drop'}</span>
              </button>
            )}
            <button 
              onClick={openShortcutManager}
              className="flex items-center text-sm px-3 py-1.5 rounded-md text-white bg-accent-color hover:bg-accent-color/90 border border-accent-color shadow-sm"
              title="Click to add, edit, delete or rearrange shortcuts"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Shortcuts
            </button>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-2">You don't have any shortcuts yet.</p>
          <button 
            onClick={openShortcutManager}
            className="px-4 py-2 bg-accent-color text-white rounded-md hover:bg-accent-color/90"
          >
            Add Shortcuts
          </button>
        </div>
        
        {/* Always render ShortcutManager */}
        {useDndKit ? (
          <ShortcutManagerDndKit isOpen={isOpen} onClose={closeShortcutManager} />
        ) : (
          <ShortcutManager isOpen={isOpen} onClose={closeShortcutManager} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-dark-100 p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium"></h3>
        <div className="flex items-center space-x-2">
          {/* Fallback toggle button - only visible if there are drag errors */}
          {error && error.includes('drag') && (
            <button 
              onClick={() => setUseDndKit(!useDndKit)}
              className="text-xs text-gray-500 dark:text-gray-400 flex items-center"
              title="Switch drag and drop implementation"
            >
              <span>{useDndKit ? 'Try alternate drag and drop' : 'Try modern drag and drop'}</span>
            </button>
          )}
          <button 
            onClick={openShortcutManager}
            className="flex items-center text-sm px-3 py-1.5 rounded-md text-white bg-accent-color hover:bg-accent-color/90 border border-accent-color shadow-sm"
            title="Click to add, edit, delete or rearrange shortcuts"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Shortcuts
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.id}
            variant="outline"
            className="h-auto py-3 px-4 flex flex-col items-center justify-center text-center border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
            onClick={() => handleShortcutClick(shortcut.url)}
          >
            <span className="block w-full truncate font-medium">{shortcut.title}</span>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              {shortcut.url.startsWith('http') ? (
                <ExternalLink className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <span className="truncate max-w-[100px]">
                {shortcut.url.startsWith('http')
                  ? new URL(shortcut.url).hostname
                  : shortcut.url}
              </span>
            </div>
          </Button>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end">
        <Settings className="h-3 w-3 mr-1" />
        <span>Click <strong>Manage Shortcuts</strong> to add, edit, or drag and drop to reorder</span>
      </div>

      {/* Always render ShortcutManager */}
      {useDndKit ? (
        <ShortcutManagerDndKit isOpen={isOpen} onClose={closeShortcutManager} />
      ) : (
        <ShortcutManager isOpen={isOpen} onClose={closeShortcutManager} />
      )}
    </div>
  );
}; 