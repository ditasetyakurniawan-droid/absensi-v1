import { useState, useRef, useEffect } from 'react';

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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result, error]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleTap = async (e) => {
    e.preventDefault();
    if (!cardUid.trim()) return;

    // 🟢 Hapus timer reset sebelumnya jika ada santri yang tap menyusul secara cepat
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/api/v1/attendance/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid: cardUid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal melakukan absensi');
      }

      setResult(data);
      setCardUid('');
      speakText(`Allahuakbar!`);
    } catch (err) {
      setError(err.message);
      setCardUid('');
      speakText(`Maaf, ${err.message}`);
    } finally {
      setLoading(false);

      // 🟢 Simpan timer ke timerRef.current di dalam finally
      timerRef.current = setTimeout(() => {
        setResult(null);
        setError(null);
      }, 5000);
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justify: 'center',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#1e293b',
        borderRadius: '20px',
        border: '1px solid #334155',
        padding: '28px 24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕌</div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#38bdf8' }}>
            PESANTREN ZABISA
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Presensi Sholat Berjamaah</p>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0', marginTop: '8px' }}>
            {currentTime.toLocaleTimeString('id-ID')}
          </div>
        </div>

        {/* Form Input Tap */}
        <form onSubmit={handleTap} style={{ marginBottom: '20px' }}>
          <input
            ref={inputRef}
            type="text"
            value={cardUid}
            onChange={(e) => setCardUid(e.target.value)}
            placeholder="Scan / Tap Kartu Santri..."
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#0f172a',
              border: '2px solid #38bdf8',
              borderRadius: '12px',
              color: '#38bdf8',
              fontSize: '15px',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
        </form>

        {/* Loading */}
        {loading && (
          <p style={{ color: '#fbbf24', fontSize: '14px', margin: '16px 0' }}>
            ⏳ Mengecek Data Santri...
          </p>
        )}

        {/* Card Result: SUKSES (Presisi & Seimbang) */}
        {result && (
          <div style={{
            backgroundColor: 'rgba(6, 78, 59, 0.4)',
            border: '1px solid #10b981',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* Frame Foto Pas: 110px x 110px */}
            <div style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              border: '3px solid #10b981',
              backgroundColor: '#0f172a',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <img 
                src={result.photo_url || 'https://via.placeholder.com/150'} 
                alt={result.full_name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Info Santri */}
            <div>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '12px',
                border: '1px solid #10b981',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                Sholat {result.prayer_name}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '4px 0' }}>
                {result.full_name}
              </h2>
              <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '0 0 8px 0' }}>
                {result.classroom}
              </p>
              <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '500' }}>
                ✅ Absensi Berhasil ({result.tapped_at.split(' ')[1]})
              </div>
            </div>
          </div>
        )}

        {/* Card Result: ERROR */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(127, 29, 29, 0.4)',
            border: '1px solid #f43f5e',
            borderRadius: '16px',
            padding: '16px',
            marginTop: '16px',
            color: '#fecdd3'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>❌</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Absensi Gagal</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>{error}</div>
          </div>
        )}

      </div>

      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '20px' }}>
        Klik sembarang area layar jika sensor RFID tidak merespon.
      </p>
    </div>
  );
}

export default App;