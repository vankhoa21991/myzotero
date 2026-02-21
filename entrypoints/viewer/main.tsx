import React from 'react';
import ReactDOM from 'react-dom/client';
import ViewerApp from './App';
import '../../assets/globals.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ViewerApp />
    </React.StrictMode>,
  );
}
