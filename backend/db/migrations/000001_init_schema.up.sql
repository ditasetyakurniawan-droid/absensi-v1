-- 1. Tabel untuk menyimpan data Santri
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nis VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    classroom VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel untuk menghubungkan ID Kartu RFID dengan Santri
CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_uid VARCHAR(50) UNIQUE NOT NULL, -- UID kartu saat di-tap
    student_id INT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 3. Tabel untuk mencatat Log Absensi Sholat
CREATE TABLE IF NOT EXISTS attendance_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    card_uid VARCHAR(50) NOT NULL,
    prayer_name VARCHAR(20) NOT NULL, -- Contoh: 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'
    tapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', -- Contoh: 'PRESENT' (Hadir), 'LATE' (Terlambat)
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);