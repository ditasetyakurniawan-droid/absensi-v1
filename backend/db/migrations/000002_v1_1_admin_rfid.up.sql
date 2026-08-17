-- v1.1: Admin authentication + student lifecycle + RFID lifecycle

-- Schema v1.0 sudah memiliki photo_url.
-- v1.1 menambahkan status aktif dan timestamp perubahan santri.
ALTER TABLE students
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER photo_url,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Schema awal memberi UNIQUE pada student_id sehingga satu santri tidak bisa memiliki
-- history kartu. v1.1 menyimpan kartu lama sebagai REPLACED/BLOCKED.
ALTER TABLE cards
    DROP INDEX student_id,
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER student_id,
    ADD COLUMN blocked_at TIMESTAMP NULL AFTER status,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD INDEX idx_cards_student_status (student_id, status),
    ADD INDEX idx_cards_status (status);

CREATE TABLE IF NOT EXISTS admins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_sessions_admin
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_sessions_admin_id (admin_id),
    INDEX idx_admin_sessions_expires_at (expires_at)
);

CREATE INDEX idx_attendance_prayer_time
    ON attendance_logs (prayer_name, tapped_at, student_id);

CREATE INDEX idx_attendance_student_time
    ON attendance_logs (student_id, tapped_at);
