import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n';
import { TributeProvider } from './context/TributeContext';

import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TributeProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </TributeProvider>
  </React.StrictMode>,
)
