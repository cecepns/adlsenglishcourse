-- ============================================================================
-- Migration 002: Revisi Lanjutan Client ADLS Solusi Indonesia (2026-11-13)
-- Aman & idempoten untuk MySQL 5.7/8.0+ maupun MariaDB (XAMPP 10.4+).
-- Mencakup:
--   1. Tabel Materi Pembelajaran (Lesson Plan & Material PDF/PPT)
--   2. Tabel Reschedule Kelas Private Otomatis (class_reschedules)
--   3. Kolom Jadwal Anti-Bentrok & Rekap Gambar 2 pada `classes` (day_1..3, time_start, time_end)
--   4. Kolom Database Lengkap Siswa Gambar 3 pada `students` (identitas, ortu, marketing, stop_reason)
--   5. Kolom Keterangan Keputusan pada `leaves` (approval_notes)
--   6. Kolom Pembayaran Tunai pada `bills` (is_cash)
-- ============================================================================

-- 1. Tabel Materi Pembelajaran & Lesson Plan (Upload Owner, Read Tutor & Staff)
CREATE TABLE IF NOT EXISTS lesson_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Lesson Plan',
  level VARCHAR(60) NULL,
  file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL DEFAULT 'pdf',
  description TEXT NULL,
  branch_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Reschedule Kelas Private Otomatis
CREATE TABLE IF NOT EXISTS class_reschedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  user_id INT NOT NULL,
  class_id INT NOT NULL,
  tutor_id INT NOT NULL,
  month VARCHAR(7) NOT NULL,
  original_date DATE NULL,
  original_time VARCHAR(20) NULL,
  new_date DATE NOT NULL,
  new_time VARCHAR(20) NOT NULL,
  reason TEXT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helper procedure untuk add column jika belum ada
DROP PROCEDURE IF EXISTS AddColIfNotExists;
DELIMITER $$
CREATE PROCEDURE AddColIfNotExists(
  IN p_table VARCHAR(64),
  IN p_col VARCHAR(64),
  IN p_def VARCHAR(255)
)
BEGIN
  DECLARE col_exists INT DEFAULT 0;
  SELECT COUNT(*) INTO col_exists
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col;
  
  IF col_exists = 0 THEN
    SET @stmt = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_col, ' ', p_def);
    PREPARE s FROM @stmt;
    EXECUTE s;
    DEALLOCATE PREPARE s;
  END IF;
END$$
DELIMITER ;

-- 3. Kolom Jadwal Terperinci pada `classes`
CALL AddColIfNotExists('classes', 'day_1', 'VARCHAR(20) NULL');
CALL AddColIfNotExists('classes', 'day_2', 'VARCHAR(20) NULL');
CALL AddColIfNotExists('classes', 'day_3', 'VARCHAR(20) NULL');
CALL AddColIfNotExists('classes', 'time_start', 'VARCHAR(15) NULL');
CALL AddColIfNotExists('classes', 'time_end', 'VARCHAR(15) NULL');

-- 4. Kolom Database Lengkap Siswa & Ortu pada `students` (Gambar 3)
CALL AddColIfNotExists('students', 'nickname', 'VARCHAR(60) NULL');
CALL AddColIfNotExists('students', 'gender', 'VARCHAR(15) NULL');
CALL AddColIfNotExists('students', 'birth_place', 'VARCHAR(80) NULL');
CALL AddColIfNotExists('students', 'birth_date', 'DATE NULL');
CALL AddColIfNotExists('students', 'school_origin', 'VARCHAR(100) NULL');
CALL AddColIfNotExists('students', 'school_grade', 'VARCHAR(40) NULL');
CALL AddColIfNotExists('students', 'religion', 'VARCHAR(40) NULL');
CALL AddColIfNotExists('students', 'siblings_count', 'INT NULL DEFAULT 0');
CALL AddColIfNotExists('students', 'child_number', 'INT NULL DEFAULT 1');
CALL AddColIfNotExists('students', 'housing_complex', 'VARCHAR(150) NULL');
CALL AddColIfNotExists('students', 'address', 'TEXT NULL');
CALL AddColIfNotExists('students', 'student_wa', 'VARCHAR(30) NULL');

CALL AddColIfNotExists('students', 'parent_father_name', 'VARCHAR(100) NULL');
CALL AddColIfNotExists('students', 'parent_father_job', 'VARCHAR(80) NULL');
CALL AddColIfNotExists('students', 'parent_mother_name', 'VARCHAR(100) NULL');
CALL AddColIfNotExists('students', 'parent_mother_job', 'VARCHAR(80) NULL');
CALL AddColIfNotExists('students', 'parent_religion', 'VARCHAR(40) NULL');
CALL AddColIfNotExists('students', 'parent_education', 'VARCHAR(40) NULL');
CALL AddColIfNotExists('students', 'parent_wa', 'VARCHAR(30) NULL');

CALL AddColIfNotExists('students', 'marketing_source', 'VARCHAR(50) NULL');
CALL AddColIfNotExists('students', 'reason_choosing', 'TEXT NULL');
CALL AddColIfNotExists('students', 'stop_reason', 'VARCHAR(100) NULL');

-- 5. Kolom Keterangan Keputusan pada `leaves`
CALL AddColIfNotExists('leaves', 'approval_notes', 'TEXT NULL');

-- 6. Kolom Pembayaran Tunai & Kas pada `bills`
CALL AddColIfNotExists('bills', 'is_cash', 'TINYINT(1) DEFAULT 0');

DROP PROCEDURE IF EXISTS AddColIfNotExists;

