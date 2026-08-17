import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './api.js';
import './Students.css';

const EMPTY_FORM = {
  nis: '',
  full_name: '',
  classroom: '',
  photo_url: '',
};

function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [cardUid, setCardUid] = useState('');
  const [cardSaving, setCardSaving] = useState(false);
  const cardInputRef = useRef(null);

  const loadStudents = async (currentSearch = search) => {
    setLoading(true);
    setError('');

    try {
      const query = currentSearch.trim()
        ? `?search=${encodeURIComponent(currentSearch.trim())}`
        : '';
      const response = await apiFetch(`/api/v1/admin/students${query}`);

      if (response.status === 401) {
        window.location.replace('/admin/login');
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data santri');
      }

      setStudents(data.records || []);
    } catch (err) {
      setError(err.message || 'Gagal mengambil data santri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const timer = window.setTimeout(() => cardInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [selectedStudent]);

  const showSuccess = (text) => {
    setMessage(text);
    setError('');
    window.setTimeout(() => setMessage(''), 3500);
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError('');

    try {
      const response = await apiFetch('/api/v1/admin/students', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menambah santri');
      }

      setForm(EMPTY_FORM);
      showSuccess('Santri berhasil ditambahkan. Sekarang kartu RFID dapat didaftarkan.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Gagal menambah santri');
    } finally {
      setSaving(false);
    }
  };

  const openEnrollment = (student) => {
    setCardUid('');
    setError('');
    setSelectedStudent(student);
  };

  const handleRegisterCard = async (event) => {
    event.preventDefault();
    if (!selectedStudent || cardSaving) return;

    const uid = cardUid.trim();
    if (!uid) return;

    setCardSaving(true);
    setError('');

    try {
      const response = await apiFetch(
        `/api/v1/admin/students/${selectedStudent.id}/cards`,
        {
          method: 'POST',
          body: JSON.stringify({ card_uid: uid }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan kartu');
      }

      setSelectedStudent(null);
      setCardUid('');
      showSuccess(`RFID ${data.card_uid} berhasil didaftarkan.`);
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Gagal mendaftarkan kartu');
      cardInputRef.current?.focus();
      cardInputRef.current?.select();
    } finally {
      setCardSaving(false);
    }
  };

  const handleBlockCard = async (student) => {
    if (!student.current_card) return;

    const confirmed = window.confirm(
      `Blokir kartu ${student.current_card.card_uid} milik ${student.full_name}?`,
    );
    if (!confirmed) return;

    setError('');

    try {
      const response = await apiFetch(
        `/api/v1/admin/cards/${student.current_card.id}/block`,
        { method: 'PATCH' },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memblokir kartu');
      }

      showSuccess('Kartu berhasil diblokir.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Gagal memblokir kartu');
    }
  };

  const handleDeactivate = async (student) => {
    const confirmed = window.confirm(
      `Nonaktifkan ${student.full_name}? Kartu aktifnya juga akan diblokir.`,
    );
    if (!confirmed) return;

    setError('');

    try {
      const response = await apiFetch(`/api/v1/admin/students/${student.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menonaktifkan santri');
      }

      showSuccess('Santri berhasil dinonaktifkan.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Gagal menonaktifkan santri');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/admin/login');
    }
  };

  return (
    <main className="students-admin-page">
      <header className="students-topbar">
        <div className="students-brand">
          <img src="/zabisa-logo.png" alt="ZABISA" />
          <div>
            <span>ADMINISTRASI PRESENSI</span>
            <h1>Data Santri & RFID</h1>
          </div>
        </div>

        <div className="students-topbar-actions">
          <a href="/admin">Dashboard</a>
          <a href="/">Kiosk</a>
          <button type="button" onClick={handleLogout}>Keluar</button>
        </div>
      </header>

      <section className="students-layout">
        <aside className="student-create-card">
          <div className="section-heading">
            <span>DATA MASTER</span>
            <h2>Tambah Santri</h2>
            <p>Tambahkan identitas santri terlebih dahulu, kemudian scan kartu RFID.</p>
          </div>

          <form onSubmit={handleCreateStudent} className="student-create-form">
            <label>
              NIS
              <input
                value={form.nis}
                onChange={(event) => setForm({ ...form, nis: event.target.value })}
                placeholder="Contoh: 20260001"
                required
              />
            </label>

            <label>
              Nama lengkap
              <input
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                placeholder="Nama santri"
                required
              />
            </label>

            <label>
              Kelas
              <input
                value={form.classroom}
                onChange={(event) => setForm({ ...form, classroom: event.target.value })}
                placeholder="Contoh: 7A"
              />
            </label>

            <label>
              URL foto <small>(opsional)</small>
              <input
                value={form.photo_url}
                onChange={(event) => setForm({ ...form, photo_url: event.target.value })}
                placeholder="https://..."
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : '+ Tambah Santri'}
            </button>
          </form>
        </aside>

        <section className="student-list-card">
          <div className="student-list-header">
            <div className="section-heading">
              <span>RFID ENROLLMENT</span>
              <h2>Santri Terdaftar</h2>
              <p>{students.length} data ditampilkan</p>
            </div>

            <form
              className="student-search"
              onSubmit={(event) => {
                event.preventDefault();
                loadStudents(search);
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama / NIS..."
              />
              <button type="submit">Cari</button>
            </form>
          </div>

          {message && <div className="student-alert success">{message}</div>}
          {error && <div className="student-alert error">{error}</div>}

          <div className="student-table-wrap">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Santri</th>
                  <th>Kelas</th>
                  <th>Kartu RFID</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="student-empty">Memuat data...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan="5" className="student-empty">Belum ada data santri.</td></tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.full_name}</strong>
                        <small>NIS {student.nis}</small>
                      </td>
                      <td>{student.classroom || '-'}</td>
                      <td>
                        {student.current_card ? (
                          <code>{student.current_card.card_uid}</code>
                        ) : (
                          <span className="no-card">Belum terdaftar</span>
                        )}
                      </td>
                      <td>
                        <span className={student.current_card ? 'rfid-status active' : 'rfid-status pending'}>
                          {student.current_card ? 'ACTIVE' : 'NO CARD'}
                        </span>
                      </td>
                      <td>
                        <div className="student-actions">
                          <button
                            type="button"
                            className="primary"
                            onClick={() => openEnrollment(student)}
                          >
                            {student.current_card ? 'Ganti RFID' : 'Daftar RFID'}
                          </button>

                          {student.current_card && (
                            <button
                              type="button"
                              className="warning"
                              onClick={() => handleBlockCard(student)}
                            >
                              Blokir
                            </button>
                          )}

                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeactivate(student)}
                          >
                            Nonaktifkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selectedStudent && (
        <div className="rfid-modal-backdrop" onMouseDown={() => !cardSaving && setSelectedStudent(null)}>
          <section className="rfid-modal" onMouseDown={(event) => event.stopPropagation()}>
            <span className="rfid-modal-eyebrow">RFID ENROLLMENT MODE</span>
            <h2>{selectedStudent.current_card ? 'Ganti Kartu RFID' : 'Daftarkan Kartu RFID'}</h2>
            <p>
              Santri: <strong>{selectedStudent.full_name}</strong> · NIS {selectedStudent.nis}
            </p>

            {selectedStudent.current_card && (
              <div className="old-card-info">
                Kartu aktif sekarang: <code>{selectedStudent.current_card.card_uid}</code>
                <small>Kartu ini otomatis menjadi REPLACED setelah kartu baru tersimpan.</small>
              </div>
            )}

            <div className="rfid-scan-visual">
              <div className="scan-wave" />
              <strong>Tempelkan kartu pada reader</strong>
              <span>UID akan masuk otomatis seperti input keyboard.</span>
            </div>

            <form onSubmit={handleRegisterCard} className="rfid-enrollment-form">
              <label>
                UID RFID
                <input
                  ref={cardInputRef}
                  type="text"
                  value={cardUid}
                  onChange={(event) => setCardUid(event.target.value)}
                  placeholder="Menunggu scan..."
                  autoComplete="off"
                  spellCheck="false"
                />
              </label>

              <div className="rfid-modal-actions">
                <button type="button" onClick={() => setSelectedStudent(null)} disabled={cardSaving}>
                  Batal
                </button>
                <button type="submit" className="save" disabled={cardSaving || !cardUid.trim()}>
                  {cardSaving ? 'Menyimpan...' : 'Simpan RFID'}
                </button>
              </div>
            </form>

            <small className="rfid-leading-zero-note">
              UID disimpan sebagai teks. Angka nol di depan seperti 0011687109 tidak akan hilang.
            </small>
          </section>
        </div>
      )}
    </main>
  );
}

export default Students;
