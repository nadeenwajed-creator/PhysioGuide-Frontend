import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';

import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-arabic';

import './styles/variables.css';
import './styles/global.css';
import './styles/light.css';
import './styles/dark.css';

import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import App from './App.jsx';

// Theme and language have separate state and storage.

createRoot(document.getElementById('root')).render(
 <StrictMode>
  <ThemeProvider>
     <LanguageProvider>
        <App />
      </LanguageProvider>
  </ThemeProvider>
</StrictMode>
);