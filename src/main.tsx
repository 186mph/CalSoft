import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initEncryptionService } from './services/encryptionService';

// Add error logging
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find root element');
  } else {
    try {
      // Render the app immediately; initialize encryption in the background to avoid blocking initial paint
      createRoot(rootElement).render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      // Fire-and-forget initialization with error handling
      initEncryptionService()
        .then(success => {
          if (!success) {
            console.error('Failed to initialize encryption service. Some features may not work properly.');
          }
        })
        .catch(err => {
          console.error('Encryption initialization error:', err);
        });
    } catch (error) {
      console.error('Failed to render app:', error);
    }
  }
