import { useEffect, useRef, useState } from 'react';
import './App.css';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function App() {
  const [cardUid, setCardUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.95;

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result, error]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const resetNotificationTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setResult(null);
      setError(null);
      inputRef.current?.focus();
    }, 5000);
  };

  const handleTap = async (e) => {
    e.preventDefault();

    const uid = cardUid.trim();

    if (!uid || loading) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/attendance/tap`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            card_uid: uid,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Gagal melakukan absensi'
        );
      }

      setResult(data);
      setCardUid('');

      speakText('Allahuakbar!');
    } catch (err) {
      setError(
        err.message || 'Terjadi kesalahan pada sistem'
      );

      setCardUid('');

      speakText(
        `Maaf, ${err.message || 'terjadi kesalahan'}`
      );
    } finally {
      setLoading(false);
      resetNotificationTimer();
    }
  };

  const formattedTime = currentTime.toLocaleTimeString(
    'id-ID',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  );

  const formattedDate = currentTime.toLocaleDateString(
    'id-ID',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  const tappedTime =
    result?.tapped_at?.includes(' ')
      ? result.tapped_at.split(' ')[1]
      : result?.tapped_at || '';

  return (
    <main
      className="kiosk-page"
      onClick={handleContainerClick}
    >
      <div className="kiosk-background kiosk-background-one" />
      <div className="kiosk-background kiosk-background-two" />

      <section className="kiosk-shell">

        {/* HEADER */}
        <header className="kiosk-topbar">
          <div className="brand-area">

            {/* LOGO ZABISA */}
            <div className="brand-icon">
              <img
                src="/zabisa-logo.png"
                alt="Logo ZABISA"
                className="brand-logo-image"
              />
            </div>

            <div className="brand-copy">
              <span className="brand-eyebrow">
                SISTEM PRESENSI DIGITAL
              </span>

              <h1>PESANTREN ZABISA</h1>

              <p>Presensi Sholat Berjamaah</p>
            </div>
          </div>

          <div className="system-status">
            <span className="status-indicator" />
            <span>Sistem Online</span>
          </div>
        </header>

        {/* CONTENT */}
        <div className="kiosk-content">

          {/* JAM */}
          <section className="clock-section">
            <span className="clock-label">
              WAKTU SEKARANG
            </span>

            <div className="digital-clock">
              {formattedTime}
            </div>

            <div className="current-date">
              {formattedDate}
            </div>
          </section>

          {/* RFID */}
          <section
            className={`tap-panel ${
              loading ? 'tap-panel-loading' : ''
            }`}
          >
            <div className="rfid-visual">
              <div className="rfid-ring rfid-ring-one" />
              <div className="rfid-ring rfid-ring-two" />

              <div className="rfid-card">
                <div className="rfid-chip">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <h2>
              {loading
                ? 'Memeriksa Kartu...'
                : 'Tempelkan Kartu Santri'}
            </h2>

            <p>
              Dekatkan kartu RFID pada reader untuk melakukan
              presensi sholat berjamaah.
            </p>

            <form
              onSubmit={handleTap}
              className="rfid-form"
            >
              <input
                ref={inputRef}
                type="text"
                value={cardUid}
                onChange={(e) =>
                  setCardUid(e.target.value)
                }
                placeholder="UID kartu akan terbaca di sini..."
                autoComplete="off"
                spellCheck="false"
                autoFocus
              />

              <button
                type="submit"
                disabled={loading || !cardUid.trim()}
              >
                {loading ? (
                  <>
                    <span className="button-spinner" />
                    Memproses
                  </>
                ) : (
                  'Proses Kartu'
                )}
              </button>
            </form>

            <div className="reader-status">
              <span className="reader-dot" />

              <span>
                RFID Reader siap menerima kartu
              </span>
            </div>
          </section>

          {/* SUKSES */}
          {result && (
            <section className="notification-card success-card">
              <div className="notification-status-icon success-icon">
                ✓
              </div>

              <div className="student-photo-wrapper">
                <img
                  src={
                    result.photo_url ||
                    'https://via.placeholder.com/180'
                  }
                  alt={result.full_name}
                  className="student-photo"
                />

                <span className="success-check">
                  ✓
                </span>
              </div>

              <div className="student-information">
                <span className="prayer-badge">
                  SHOLAT {result.prayer_name}
                </span>

                <h2>{result.full_name}</h2>

                <p className="student-class">
                  {result.classroom}
                </p>

                <div className="success-message">
                  <span>✓</span>
                  Presensi berhasil dicatat
                </div>

                {tappedTime && (
                  <span className="tap-time">
                    Tercatat pukul {tappedTime}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* ERROR */}
          {error && (
            <section className="notification-card error-card">
              <div className="notification-status-icon error-icon">
                !
              </div>

              <div className="error-content">
                <span className="error-eyebrow">
                  PRESENSI GAGAL
                </span>

                <h2>
                  Kartu Tidak Dapat Diproses
                </h2>

                <p>{error}</p>

                <span className="error-help">
                  Silakan tempelkan kembali kartu atau hubungi
                  petugas.
                </span>
              </div>
            </section>
          )}
        </div>

        {/* FOOTER */}
        <footer className="kiosk-footer">
          <div>
            <span className="footer-dot" />
            RFID Reader aktif
          </div>

          <div>
            Klik area layar jika reader tidak merespons.
          </div>

          <a
            href="/admin"
            onClick={(e) => e.stopPropagation()}
          >
            Dashboard Admin →
          </a>
        </footer>
      </section>
    </main>
  );
}

export default App;