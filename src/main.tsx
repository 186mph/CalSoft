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
    // Initialize the encryption service before rendering the app
    initEncryptionService().then(success => {
      if (!success) {
        console.error('Failed to initialize encryption service. Some features may not work properly.');
      } else {
        console.log('Encryption service initialized successfully.');
      }

      // Continue with app rendering
      createRoot(rootElement).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    });
  } catch (error) {
    console.error('Failed to render app:', error);
  }
}
