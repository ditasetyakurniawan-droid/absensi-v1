import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import Dashboard from './Dashboard.jsx';

import './index.css';

function MainRouter() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  return path === '/admin'
    ? <Dashboard />
    : <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainRouter />
  </React.StrictMode>
);