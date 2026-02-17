import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FamilyProvider } from './data/FamilyContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FamilyProvider>
        <App />
      </FamilyProvider>
    </BrowserRouter>
  </React.StrictMode>
);
