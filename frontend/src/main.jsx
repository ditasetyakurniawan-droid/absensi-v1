import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import Dashboard from './Dashboard.jsx';
import AdminGuard from './AdminGuard.jsx';
import AdminLogin from './AdminLogin.jsx';
import Students from './Students.jsx';

import './index.css';

function MainRouter() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/admin/login') {
    return <AdminLogin />;
  }

  if (path === '/admin/students') {
    return (
      <AdminGuard>
        <Students />
      </AdminGuard>
    );
  }

  if (path === '/admin') {
    return (
      <AdminGuard>
        <Dashboard />
      </AdminGuard>
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainRouter />
  </React.StrictMode>,
);
