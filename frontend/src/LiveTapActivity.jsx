import { useState } from 'react';

function PulseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 12H7L9.2 7L13 17L16 10L18 12H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M12 7V12L15.5 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitials(name = '') {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'SZ';
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();
}

function LiveTapActivity({ items = [] }) {
  const [failedImages, setFailedImages] = useState({});

  const visibleItems = items.slice(0, 8);

  const handleImageError = (id) => {
    setFailedImages((previous) => ({
      ...previous,
      [id]: true,
    }));
  };

  return (
    <article className="panel live-panel live-activity-panel">

      {/* HEADER */}
      <div className="live-activity-header">

        <div>
          <div className="live-title-row">

            <span className="live-status-dot" />

            <span className="live-kicker">
              REAL-TIME ACTIVITY
            </span>

          </div>

          <h2>
            Live Tap Activity
          </h2>

          <p>
            Aktivitas presensi santri terbaru
          </p>
        </div>

        <div className="live-header-right">

          {visibleItems.length > 0 && (
            <span className="live-count">
              {visibleItems.length}
            </span>
          )}

          <span className="live-badge">
            <i />
            LIVE
          </span>

        </div>

      </div>

      {/* CONTENT */}
      <div
        className="live-activity-list"
        aria-live="polite"
      >

        {visibleItems.length === 0 ? (

          <div className="live-empty-state">

            <div className="live-empty-visual">

              <span className="live-empty-ring ring-one" />
              <span className="live-empty-ring ring-two" />

              <div className="live-empty-icon">
                <PulseIcon />
              </div>

            </div>

            <strong>
              Belum ada aktivitas
            </strong>

            <p>
              Tap kartu RFID santri akan muncul
              secara otomatis di sini.
            </p>

            <div className="live-waiting-status">
              <span />
              Menunggu tap kartu...
            </div>

          </div>

        ) : (

          visibleItems.map((item, index) => {
            const itemKey =
              item.id ??
              `${item.full_name}-${item.time_str}`;

            const imageFailed =
              failedImages[itemKey];

            const hasPhoto =
              Boolean(item.photo_url) &&
              !imageFailed;

            return (
              <div
                key={itemKey}
                className={
                  index === 0
                    ? 'live-activity-item latest'
                    : 'live-activity-item'
                }
                style={{
                  animationDelay: `${Math.min(
                    index * 45,
                    250
                  )}ms`,
                }}
              >

                {/* AVATAR */}
                <div className="live-avatar-wrapper">

                  {hasPhoto ? (

                    <img
                      src={item.photo_url}
                      alt={item.full_name}
                      className="live-avatar"
                      onError={() =>
                        handleImageError(itemKey)
                      }
                    />

                  ) : (

                    <div className="live-avatar live-avatar-fallback">
                      {getInitials(item.full_name)}
                    </div>

                  )}

                  <span className="avatar-online-dot" />

                </div>

                {/* INFORMATION */}
                <div className="live-person-info">

                  <div className="live-name-row">

                    <strong>
                      {item.full_name}
                    </strong>

                    {index === 0 && (
                      <span className="latest-badge">
                        TERBARU
                      </span>
                    )}

                  </div>

                  <div className="live-meta">

                    <span>
                      {item.classroom || '-'}
                    </span>

                    <i />

                    <span className="live-prayer">
                      {item.prayer_name || '-'}
                    </span>

                  </div>

                </div>

                {/* TIME */}
                <div className="live-time">

                  <ClockIcon />

                  <span>
                    {item.time_str || '--:--:--'}
                  </span>

                </div>

              </div>
            );
          })

        )}

      </div>

      {/* FOOTER */}
      <div className="live-activity-footer">

        <div>
          <span className="footer-live-dot" />

          Pembaruan otomatis
        </div>

        <span>
          Maks. 8 aktivitas terbaru
        </span>

      </div>

    </article>
  );
}

export default LiveTapActivity;