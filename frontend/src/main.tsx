import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { bootTheme } from './theme';

// EasySale - Dark Theme Professional Design - v2.0

// Boot theme before React renders to prevent flash and ensure CSS variables are set
// This applies the default teal theme or cached theme immediately
bootTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
