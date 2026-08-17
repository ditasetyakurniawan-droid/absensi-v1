import { useEffect, useState } from 'react';
import { apiFetch } from './api.js';
import './AdminLogin.css';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/v1/auth/me').then((response) => {
      if (response.ok) {
        window.location.replace('/admin');
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      window.location.replace('/admin');
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">
          <img src="/zabisa-logo.png" alt="ZABISA" />
          <div>
            <span>SISTEM PRESENSI DIGITAL</span>
            <h1>Admin ZABISA</h1>
          </div>
        </div>

        <div className="admin-login-copy">
          <h2>Masuk ke Dashboard</h2>
          <p>Kelola santri, kartu RFID, dan data presensi.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="admin-login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <a className="admin-login-kiosk" href="/">← Kembali ke layar kiosk</a>
      </section>
    </main>
  );
}

export default AdminLogin;
