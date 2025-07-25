// This script can be manually executed in the browser console to reset the Supabase client's schema cache
(function() {
  console.log("Attempting to force Supabase schema cache reset...");
  
  // Try to get the Supabase client from window
  if (window.supabase) {
    console.log("Found Supabase client in window");
    
    // Method 1: Clear localStorage
    try {
      console.log("Clearing localStorage...");
      // First backup any auth data
      const authData = localStorage.getItem('supabase.auth.token');
      
      // Clear all Supabase-related items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.')) {
          if (!key.includes('auth')) { // Preserve auth data
            localStorage.removeItem(key);
          }
        }
      });
      
      console.log("LocalStorage cleared");
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
    
    // Method 2: Force reset Supabase client
    if (typeof window.supabase.reset === 'function') {
      try {
        console.log("Resetting Supabase client...");
        window.supabase.reset();
        console.log("Supabase client reset");
      } catch (e) {
        console.error("Error resetting Supabase client:", e);
      }
    }
    
    // Method 3: Try to force a connection refresh
    try {
      console.log("Forcing connection refresh...");
      window.supabase.from('').select('*').limit(1).then(() => {
        console.log("Connection refreshed");
      }).catch(e => {
        console.error("Error refreshing connection:", e);
      });
    } catch (e) {
      console.error("Error refreshing connection:", e);
    }
    
    console.log("Schema cache reset attempt completed.");
    console.log("Please reload the page (Ctrl+F5 or Cmd+Shift+R) and try again.");
  } else {
    console.error("Supabase client not found in window. Make sure you're on a page that uses Supabase.");
  }
})(); 