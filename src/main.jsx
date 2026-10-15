import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';


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

// Global providers are shared by every page

createRoot(document.getElementById('root')).render(
 <StrictMode>
      <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
</StrictMode>
);