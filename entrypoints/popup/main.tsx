import React from 'react';
import ReactDOM from 'react-dom/client';
import PopupApp from './App';
import '../../assets/globals.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>,
  );
}
