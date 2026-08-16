import { useEffect, useState } from 'react';
import './Dashboard.css';
import LiveTapActivity from './LiveTapActivity.jsx';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const PRAYERS = ['Subuh', 'Dzuhur', 'Asar', 'Magrib', 'Isya'];

const MONTHS = [
  ['01', 'Januari'],
  ['02', 'Februari'],
  ['03', 'Maret'],
  ['04', 'April'],
  ['05', 'Mei'],
  ['06', 'Juni'],
  ['07', 'Juli'],
  ['08', 'Agustus'],
  ['09', 'September'],
  ['10', 'Oktober'],
  ['11', 'November'],
  ['12', 'Desember'],
];

/* =====================================================
   BASE SVG ICON
===================================================== */

function SvgIcon({
  children,
  size = 20,
  viewBox = '0 0 24 24',
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        display: 'block',
        flexShrink: 0,
      }}
    >
      {children}
    </svg>
  );
}

/* =====================================================
   ICON - DASHBOARD
===================================================== */

function DashboardIcon({ size = 18 }) {
  return (
    <SvgIcon size={size}>
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - ACTIVITY
===================================================== */

function ActivityIcon({ size = 18 }) {
  return (
    <SvgIcon size={size}>
      <path
        d="M3 12H7L9.3 6L13.3 18L16 10L18 12H21"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - REPORT
===================================================== */

function ReportIcon({ size = 18 }) {
  return (
    <SvgIcon size={size}>
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 8H15.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.5 12H15.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.5 16H13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - MONITOR
===================================================== */

function MonitorIcon({ size = 18 }) {
  return (
    <SvgIcon size={size}>
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 21H16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 17V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - USERS
===================================================== */

function UsersIcon({ size = 20 }) {
  return (
    <SvgIcon size={size}>
      <path
        d="M16 21V19C16 16.8 14.2 15 12 15H7C4.8 15 3 16.8 3 19V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle
        cx="9.5"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16 4.2C17.7 4.7 19 6.3 19 8.2C19 10.1 17.7 11.7 16 12.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 15.4C19.8 16.1 21 17.7 21 19.5V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - MOON
===================================================== */

function MoonIcon({ size = 20 }) {
  return (
    <SvgIcon size={size}>
      <path
        d="M20.2 15.1C18.9 15.7 17.5 16 16 16C11.6 16 8 12.4 8 8C8 6.5 8.4 5 9.1 3.8C5.6 5 3 8.3 3 12.2C3 17.1 6.9 21 11.8 21C15.6 21 18.9 18.6 20.2 15.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - CHECK
===================================================== */

function CheckCircleIcon({ size = 20 }) {
  return (
    <SvgIcon size={size}>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 12.2L10.7 15L16.5 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   ICON - CHART
===================================================== */

function ChartIcon({ size = 20 }) {
  return (
    <SvgIcon size={size}>
      <path
        d="M4 20V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 20V9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 20V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 20H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

/* =====================================================
   MAIN DASHBOARD
===================================================== */

function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    current_prayer: '',
    present_count: 0,
    recent_taps: [],
  });

  const [activeTab, setActiveTab] = useState('daily');

  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [filterPrayer, setFilterPrayer] = useState('');
  const [reports, setReports] = useState([]);

  const [filterMonth, setFilterMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, '0')
  );

  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear())
  );

  const [monthlyReports, setMonthlyReports] = useState([]);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [statsError, setStatsError] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  /* =====================================================
     CLOCK
  ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =====================================================
     DASHBOARD REAL-TIME
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/dashboard/today`
        );

        if (!response.ok) {
          throw new Error('Gagal mengambil statistik');
        }

        const data = await response.json();

        if (mounted) {
          setStats({
            total_students: data.total_students || 0,
            current_prayer: data.current_prayer || '',
            present_count: data.present_count || 0,
            recent_taps: data.recent_taps || [],
          });

          setStatsError(false);
        }
      } catch (error) {
        console.error('Gagal memuat statistik:', error);

        if (mounted) {
          setStatsError(true);
        }
      }
    };

    fetchStats();

    const interval = setInterval(fetchStats, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* =====================================================
     DAILY REPORT
  ===================================================== */

  useEffect(() => {
    if (activeTab !== 'daily') return;

    let cancelled = false;

    const fetchDaily = async () => {
      setReportLoading(true);

      try {
        let url =
          `${API_BASE_URL}/api/v1/reports/attendance` +
          `?date=${filterDate}`;

        if (filterPrayer) {
          url += `&prayer=${encodeURIComponent(filterPrayer)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Gagal mengambil laporan harian');
        }

        const data = await response.json();

        if (!cancelled) {
          setReports(data.records || []);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setReports([]);
        }
      } finally {
        if (!cancelled) {
          setReportLoading(false);
        }
      }
    };

    fetchDaily();

    return () => {
      cancelled = true;
    };
  }, [filterDate, filterPrayer, activeTab]);

  /* =====================================================
     MONTHLY REPORT
  ===================================================== */

  useEffect(() => {
    if (activeTab !== 'monthly') return;

    let cancelled = false;

    const fetchMonthly = async () => {
      setReportLoading(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/reports/monthly` +
            `?month=${filterMonth}&year=${filterYear}`
        );

        if (!response.ok) {
          throw new Error('Gagal mengambil laporan bulanan');
        }

        const data = await response.json();

        if (!cancelled) {
          setMonthlyReports(data.records || []);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setMonthlyReports([]);
        }
      } finally {
        if (!cancelled) {
          setReportLoading(false);
        }
      }
    };

    fetchMonthly();

    return () => {
      cancelled = true;
    };
  }, [filterMonth, filterYear, activeTab]);

  /* =====================================================
     CALCULATION
  ===================================================== */

  const attendanceRate =
    Number(stats.total_students) > 0
      ? Math.round(
          (Number(stats.present_count) /
            Number(stats.total_students)) *
            100
        )
      : 0;

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <main className="admin-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="admin-sidebar">

        {/* BRAND */}

        <div className="sidebar-brand">

          <div className="sidebar-logo">
            <img
              src="/zabisa-logo.png"
              alt="Logo ZABISA"
              className="sidebar-logo-image"
            />
          </div>

          <div className="sidebar-brand-copy">
            <span>ZABISA</span>
            <small>Presensi Digital</small>
          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="sidebar-navigation">

          <span className="nav-caption">
            MENU UTAMA
          </span>

          <button className="nav-item active">

            <span className="nav-icon">
              <DashboardIcon />
            </span>

            <span>
              Dashboard
            </span>

          </button>

          <button className="nav-item">

            <span className="nav-icon">
              <ActivityIcon />
            </span>

            <span>
              Monitoring
            </span>

          </button>

          <button className="nav-item">

            <span className="nav-icon">
              <ReportIcon />
            </span>

            <span>
              Rekap Absensi
            </span>

          </button>

        </nav>

        {/* BOTTOM */}

        <div className="sidebar-bottom">

          <a
            href="/"
            className="kiosk-link"
          >

            <span className="kiosk-link-icon">
              <MonitorIcon />
            </span>

            <div>
              <strong>
                Layar Kiosk
              </strong>

              <small>
                Buka halaman RFID
              </small>
            </div>

            <b>
              ↗
            </b>

          </a>

          <div className="sidebar-system">

            <span className="online-dot" />

            Sistem aktif

          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <section className="admin-main">

        {/* HEADER */}

        <header className="admin-header">

          <div className="admin-header-copy">

            <span className="header-eyebrow">
              SISTEM PRESENSI DIGITAL
            </span>

            <h1>
              Dashboard Monitoring
            </h1>

            <p>
              Pantau aktivitas presensi sholat santri
              secara real-time.
            </p>

          </div>

          <div className="header-right">

            <div className="header-clock">

              <strong>
                {formattedTime}
              </strong>

              <span>
                {formattedDate}
              </span>

            </div>

            <div
              className={
                statsError
                  ? 'connection-status error'
                  : 'connection-status'
              }
            >

              <span />

              {statsError
                ? 'Backend Offline'
                : 'Sistem Online'}

            </div>

          </div>

        </header>

        {/* =================================================
            METRIC CARDS
        ================================================= */}

        <section className="metric-grid">

          {/* TOTAL SANTRI */}

          <article className="metric-card">

            <div className="metric-top">

              <div className="metric-icon blue">
                <UsersIcon />
              </div>

              <span className="metric-label">
                TOTAL SANTRI
              </span>

            </div>

            <strong className="metric-number">
              {stats.total_students}
            </strong>

            <span className="metric-description">
              Santri terdaftar
            </span>

          </article>

          {/* SHOLAT AKTIF */}

          <article className="metric-card">

            <div className="metric-top">

              <div className="metric-icon cyan">
                <MoonIcon />
              </div>

              <span className="metric-label">
                SHOLAT AKTIF
              </span>

            </div>

            <strong className="metric-prayer">
              {stats.current_prayer || 'Tidak Aktif'}
            </strong>

            <span className="metric-description">
              Sesi presensi saat ini
            </span>

          </article>

          {/* SUDAH HADIR */}

          <article className="metric-card green-card">

            <div className="metric-top">

              <div className="metric-icon green">
                <CheckCircleIcon />
              </div>

              <span className="metric-label">
                SUDAH HADIR
              </span>

            </div>

            <strong className="metric-number green-text">
              {stats.present_count}
            </strong>

            <span className="metric-description">
              Santri pada sholat aktif
            </span>

          </article>

          {/* KEHADIRAN */}

          <article className="metric-card">

            <div className="metric-top">

              <div className="metric-icon violet">
                <ChartIcon />
              </div>

              <span className="metric-label">
                KEHADIRAN
              </span>

            </div>

            <div className="rate-row">

              <strong className="metric-number">
                {attendanceRate}%
              </strong>

              <span>
                {stats.present_count}/
                {stats.total_students}
              </span>

            </div>

            <div className="rate-progress">
              <div
                style={{
                  width: `${Math.min(
                    attendanceRate,
                    100
                  )}%`,
                }}
              />
            </div>

          </article>

        </section>

        {/* =================================================
            DASHBOARD CONTENT
        ================================================= */}

        <section className="dashboard-content">

          {/* =================================================
              LIVE TAP ACTIVITY
          ================================================= */}

          <LiveTapActivity items={stats.recent_taps} />

          {/* =================================================
              REPORT
          ================================================= */}

          <article className="panel report-panel">

            {/* REPORT HEADER */}

            <div className="report-header">

              <div className="report-tabs">

                <button
                  className={
                    activeTab === 'daily'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setActiveTab('daily')
                  }
                >
                  Rekap Harian
                </button>

                <button
                  className={
                    activeTab === 'monthly'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setActiveTab('monthly')
                  }
                >
                  Nilai Kedisiplinan
                </button>

              </div>

              {/* FILTER */}

              {activeTab === 'daily' ? (

                <div className="filter-group">

                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) =>
                      setFilterDate(e.target.value)
                    }
                  />

                  <select
                    value={filterPrayer}
                    onChange={(e) =>
                      setFilterPrayer(e.target.value)
                    }
                  >

                    <option value="">
                      Semua Sholat
                    </option>

                    {PRAYERS.map((prayer) => (

                      <option
                        value={prayer}
                        key={prayer}
                      >
                        {prayer}
                      </option>

                    ))}

                  </select>

                </div>

              ) : (

                <div className="filter-group">

                  <select
                    value={filterMonth}
                    onChange={(e) =>
                      setFilterMonth(e.target.value)
                    }
                  >

                    {MONTHS.map(
                      ([value, label]) => (

                        <option
                          value={value}
                          key={value}
                        >
                          {label}
                        </option>

                      )
                    )}

                  </select>

                  <input
                    className="year-input"
                    type="number"
                    min="2020"
                    max="2100"
                    value={filterYear}
                    onChange={(e) =>
                      setFilterYear(e.target.value)
                    }
                  />

                </div>

              )}

            </div>

            {/* =================================================
                TABLE
            ================================================= */}

            <div className="table-wrapper">

              {reportLoading && (

                <div className="table-loading">

                  <span />

                  Memuat data...

                </div>

              )}

              {/* DAILY */}

              {activeTab === 'daily' && (

                <table className="attendance-table">

                  <thead>
                    <tr>
                      <th>WAKTU TAP</th>
                      <th>NAMA SANTRI</th>
                      <th>KELAS</th>
                      <th>SHOLAT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>

                    {!reportLoading &&
                    reports.length === 0 ? (

                      <tr>

                        <td
                          colSpan="5"
                          className="table-empty"
                        >
                          Belum ada data absensi.
                        </td>

                      </tr>

                    ) : (

                      reports.map((row) => (

                        <tr key={row.id}>

                          <td className="time-cell">
                            {row.tapped_at}
                          </td>

                          <td>
                            <strong>
                              {row.full_name}
                            </strong>
                          </td>

                          <td>
                            {row.classroom}
                          </td>

                          <td>

                            <span className="prayer-text">
                              {row.prayer_name}
                            </span>

                          </td>

                          <td>

                            <span className="status-badge">

                              <i />

                              {row.status}

                            </span>

                          </td>

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

              )}

              {/* MONTHLY */}

              {activeTab === 'monthly' && (

                <table className="attendance-table">

                  <thead>
                    <tr>
                      <th>NAMA SANTRI</th>
                      <th>KELAS</th>
                      <th>TOTAL HADIR</th>
                      <th>PERSENTASE</th>
                      <th>KEDISIPLINAN</th>
                    </tr>
                  </thead>

                  <tbody>

                    {!reportLoading &&
                    monthlyReports.length === 0 ? (

                      <tr>

                        <td
                          colSpan="5"
                          className="table-empty"
                        >
                          Belum ada data rekap bulanan.
                        </td>

                      </tr>

                    ) : (

                      monthlyReports.map((row) => {

                        const percentage =
                          Number(row.persentase) || 0;

                        return (

                          <tr key={row.student_id}>

                            <td>
                              <strong>
                                {row.full_name}
                              </strong>
                            </td>

                            <td>
                              {row.classroom}
                            </td>

                            <td>

                              <strong className="attendance-total">
                                {row.total_hadir}
                              </strong>

                              <span className="session-total">
                                {' '}
                                / 150
                              </span>

                            </td>

                            <td>

                              <div className="percentage-cell">

                                <strong>
                                  {percentage.toFixed(1)}%
                                </strong>

                                <div>

                                  <span
                                    style={{
                                      width: `${Math.min(
                                        percentage,
                                        100
                                      )}%`,
                                    }}
                                  />

                                </div>

                              </div>

                            </td>

                            <td>

                              <span
                                className={
                                  percentage >= 75
                                    ? 'grade-badge good'
                                    : 'grade-badge bad'
                                }
                              >
                                {row.grade}
                              </span>

                            </td>

                          </tr>

                        );
                      })

                    )}

                  </tbody>

                </table>

              )}

            </div>

            {/* FOOTER */}

            <footer className="report-footer">

              <span>
                {activeTab === 'daily'
                  ? `${reports.length} data presensi`
                  : `${monthlyReports.length} santri`}
              </span>

              <span>
                Data diperbarui otomatis dari server
              </span>

            </footer>

          </article>

        </section>

      </section>

    </main>
  );
}

export default Dashboard;