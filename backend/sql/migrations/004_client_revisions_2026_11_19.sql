-- ============================================================================
-- Migration 004: Revisi Role Owner, Siswa/Karyawan, & Orang Tua (Roadmap, Evaluasi Bulanan & Pricelist)
-- Tanggal: 2026-11-19
-- Aman & idempoten untuk MySQL 5.7 / 8.0+ dan MariaDB (XAMPP).
-- Mencakup:
--   1. Tabel Master Template Topik Roadmap 12 Pertemuan (roadmap_templates)
--   2. Tabel Nilai Perkembangan Siswa 12 Pertemuan / Learning Journey (student_journey_scores)
--   3. Tabel Template Desain Evaluasi Belajar Bulanan per Kelas / Global (monthly_eval_templates)
--   4. Tabel Lembar Nilai Evaluasi Bulanan Siswa (monthly_eval_scores)
--   5. Kolom Nominal Pricelist SPP pada tabel `students` (students.pricelist)
-- ============================================================================

-- 1. Tabel Master Template Topik Roadmap 12 Pertemuan (Admin & Tutor dapat mengubah per level / default)
CREATE TABLE IF NOT EXISTS roadmap_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
  meeting_number INT NOT NULL,
  topic VARCHAR(200) NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_level_meeting (level, meeting_number)
);

-- Seed 12 topik standar roadmap pertemuan default
INSERT IGNORE INTO roadmap_templates (level, meeting_number, topic) VALUES
  ('DEFAULT', 1, 'Greeting and Introduction'),
  ('DEFAULT', 2, 'Colours, Numbers and Fruits'),
  ('DEFAULT', 3, 'Days and the Calendar'),
  ('DEFAULT', 4, 'Family and Daily Activities'),
  ('DEFAULT', 5, 'Hobbies and Free Time'),
  ('DEFAULT', 6, 'Food, Drinks and Ordering'),
  ('DEFAULT', 7, 'Places and Giving Directions'),
  ('DEFAULT', 8, 'Describing People and Objects'),
  ('DEFAULT', 9, 'Past Experiences and Stories'),
  ('DEFAULT', 10, 'Plans, Goals and Future'),
  ('DEFAULT', 11, 'Practical Conversation & Presentation'),
  ('DEFAULT', 12, 'Final Review & Level Evaluation');

-- 2. Tabel Nilai Perkembangan Siswa 12 Pertemuan (Speaking, Listening, Writing, Reading)
CREATE TABLE IF NOT EXISTS student_journey_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  meeting_number INT NOT NULL,
  topic_override VARCHAR(200) NULL,
  speaking INT NULL,
  listening INT NULL,
  writing INT NULL,
  reading INT NULL,
  notes VARCHAR(255) NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_stu_meeting (student_id, meeting_number)
);

-- 3. Tabel Desain Template Evaluasi Belajar Bulanan (Lembar Evaluasi per Kelas / Global)
CREATE TABLE IF NOT EXISTS monthly_eval_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL DEFAULT 0,
  month VARCHAR(7) NOT NULL DEFAULT 'DEFAULT',
  title VARCHAR(150) NULL,
  structure_json LONGTEXT NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class_month (class_id, month)
);

-- 4. Tabel Nilai Evaluasi Belajar Bulanan Siswa (Skala 1 - 4 & Keterangan)
CREATE TABLE IF NOT EXISTS monthly_eval_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_id INT NOT NULL DEFAULT 0,
  month VARCHAR(7) NOT NULL,
  scores_json LONGTEXT NOT NULL,
  notes TEXT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_stu_month (student_id, month)
);

-- Helper procedure untuk add column jika belum ada (idempoten)
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

-- 5. Kolom Nominal Pricelist SPP pada tabel `students`
CALL AddColIfNotExists('students', 'pricelist', 'DECIMAL(12,2) NULL');

DROP PROCEDURE IF EXISTS AddColIfNotExists;
