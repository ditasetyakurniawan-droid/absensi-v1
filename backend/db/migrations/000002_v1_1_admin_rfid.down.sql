-- WARNING:
-- Rollback ke v1.0 mengembalikan UNIQUE(student_id) pada tabel cards.
-- Pastikan setiap student memiliki maksimal satu record cards sebelum
-- menjalankan migration ini. History RFID v1.1 tidak dapat direpresentasikan
-- sepenuhnya oleh schema v1.0.

DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admins;

DROP INDEX idx_attendance_student_time ON attendance_logs;
DROP INDEX idx_attendance_prayer_time ON attendance_logs;

ALTER TABLE cards
    DROP INDEX idx_cards_status,
    DROP INDEX idx_cards_student_status,
    DROP COLUMN updated_at,
    DROP COLUMN blocked_at,
    DROP COLUMN status,
    ADD UNIQUE INDEX student_id (student_id);

ALTER TABLE students
    DROP COLUMN updated_at,
    DROP COLUMN is_active;
