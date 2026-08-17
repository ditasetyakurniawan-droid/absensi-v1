import { useEffect, useState } from 'react';
import { apiFetch } from './api.js';

function AdminGuard({ children }) {
  const [state, setState] = useState({ loading: true, admin: null });

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const response = await apiFetch('/api/v1/auth/me');

        if (response.status === 401) {
          window.location.replace('/admin/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Gagal memeriksa sesi admin');
        }

        const data = await response.json();
        if (mounted) {
          setState({ loading: false, admin: data.admin });
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setState({ loading: false, admin: null });
        }
      }
    };

    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  if (state.loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Memeriksa sesi admin...
      </main>
    );
  }

  if (!state.admin) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Tidak dapat memverifikasi sesi admin.
      </main>
    );
  }

  return children;
}

export default AdminGuard;
