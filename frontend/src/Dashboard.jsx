import { useState, useEffect } from 'react';

// Ambil URL Backend dari Environment Variable (Vite/React)
// Jika variabel VITE_API_BASE_URL tidak diset, otomatis memakai fallback localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default function Dashboard() {
  const [stats, setStats] = useState({ total_students: 0, current_prayer: '', present_count: 0, recent_taps: [] });
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' atau 'monthly'
  
  // Filter Harian
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPrayer, setFilterPrayer] = useState('');
  const [reports, setReports] = useState([]);

  // Filter Bulanan
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [monthlyReports, setMonthlyReports] = useState([]);

  // Polling Real-time Live Feed
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/today`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Gagal memuat statistik", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Laporan Harian
  useEffect(() => {
    if (activeTab === 'daily') {
      let url = `${API_BASE_URL}/api/v1/reports/attendance?date=${filterDate}`;
      if (filterPrayer) url += `&prayer=${filterPrayer}`;
      fetch(url).then(res => res.json()).then(data => setReports(data.records || []));
    }
  }, [filterDate, filterPrayer, activeTab]);

  // Fetch Laporan Bulanan
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetch(`${API_BASE_URL}/api/v1/reports/monthly?month=${filterMonth}&year=${filterYear}`)
        .then(res => res.json())
        .then(data => setMonthlyReports(data.records || []));
    }
  }, [filterMonth, filterYear, activeTab]);

  return (
    <div style={{ padding: '28px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>📊 Dashboard Monitoring Absensi</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>Pesantren Zabisa - Real-time Attendance System</p>
        </div>
        <a href="/" style={{ color: '#38bdf8', textDecoration: 'none', backgroundColor: '#1e293b', padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', fontSize: '14px' }}>
          🖥️ Layar Kiosk
        </a>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>TOTAL SANTRI</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '4px', color: '#ffffff' }}>{stats.total_students}</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>SHOLAT AKTIF</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: stats.current_prayer ? '#38bdf8' : '#ef4444', marginTop: '4px' }}>
            {stats.current_prayer || 'Di Luar Jam Sholat'}
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#34d399', textTransform: 'uppercase' }}>HADIR SHOLAT AKTIF</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
            {stats.present_count} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'normal' }}>Santri</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px' }}>
        
        {/* Live Tap Feed */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', color: '#f8fafc', marginBottom: '16px', marginTop: 0 }}>⚡ Live Tap Activity</h2>
          {stats.recent_taps?.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Belum ada santri tap hari ini.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recent_taps?.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <img src={item.photo_url || 'https://via.placeholder.com/40'} alt={item.full_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{item.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.classroom} • <span style={{ color: '#34d399' }}>{item.prayer_name}</span></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>{item.time_str}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Laporan & Rekap */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          
          {/* Header Navigation Tab */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setActiveTab('daily')}
                style={{ backgroundColor: activeTab === 'daily' ? '#38bdf8' : 'transparent', color: activeTab === 'daily' ? '#0f172a' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📋 Rekap Harian
              </button>
              <button 
                onClick={() => setActiveTab('monthly')}
                style={{ backgroundColor: activeTab === 'monthly' ? '#38bdf8' : 'transparent', color: activeTab === 'monthly' ? '#0f172a' : '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🏆 Nilai Kedisiplinan (30 Hari)
              </button>
            </div>

            {/* Filter Control sesuai Tab */}
            {activeTab === 'daily' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }} />
                <select value={filterPrayer} onChange={(e) => setFilterPrayer(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}>
                  <option value="">Semua Sholat</option>
                  <option value="Subuh">Subuh</option>
                  <option value="Dzuhur">Dzuhur</option>
                  <option value="Asar">Asar</option>
                  <option value="Magrib">Magrib</option>
                  <option value="Isya">Isya</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}>
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
                <input type="number" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', width: '80px' }} />
              </div>
            )}
          </div>

          {/* TAB 1: Tabel Harian */}
          {activeTab === 'daily' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Waktu Tap</th>
                    <th style={{ padding: '10px' }}>Nama Santri</th>
                    <th style={{ padding: '10px' }}>Kelas</th>
                    <th style={{ padding: '10px' }}>Sholat</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tidak ada data absensi</td></tr>
                  ) : (
                    reports.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ padding: '10px', color: '#cbd5e1', fontFamily: 'monospace' }}>{row.tapped_at}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#ffffff' }}>{row.full_name}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{row.classroom}</td>
                        <td style={{ padding: '10px', color: '#38bdf8' }}>{row.prayer_name}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid #10b981' }}>{row.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Tabel Nilai Kedisiplinan Bulanan */}
          {activeTab === 'monthly' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Nama Santri</th>
                    <th style={{ padding: '10px' }}>Kelas</th>
                    <th style={{ padding: '10px' }}>Total Hadir</th>
                    <th style={{ padding: '10px' }}>Persentase</th>
                    <th style={{ padding: '10px' }}>Grade Kedisiplinan</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReports.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tidak ada data rekap bulanan</td></tr>
                  ) : (
                    monthlyReports.map((row) => (
                      <tr key={row.student_id} style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#ffffff' }}>{row.full_name}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{row.classroom}</td>
                        <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>{row.total_hadir} / 150 Sesi</td>
                        <td style={{ padding: '10px', color: '#34d399', fontWeight: 'bold' }}>{row.persentase.toFixed(1)}%</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: row.persentase >= 75 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: row.persentase >= 75 ? '#34d399' : '#f87171',
                            border: `1px solid ${row.persentase >= 75 ? '#10b981' : '#ef4444'}`
                          }}>
                            {row.grade}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}