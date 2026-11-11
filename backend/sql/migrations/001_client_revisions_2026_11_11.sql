-- ============================================================================
-- Migration 001: Revisi Client ADLS English Course (2026-11-11)
-- Aman & idempoten untuk MySQL 5.7/8.0+ maupun MariaDB (XAMPP 10.4+).
-- Mencakup:
--   - Multi-cabang tutor 1 akun (`tutor_branches`)
--   - Type Kelas (`classes.class_type`, `students.class_type`) & standar 5 level (`VARCHAR(60)`)
--   - Kelulusan & pilihan E-Sertifikat / Ambil di Admin Pusat (`students.course_completed`, dll.)
--   - Kolom nilai pre-filled Admin Cabang di Portal Tutor (`learning_reports.material` NULL)
--   - Routing komplen tutor ke Admin Cabang & Admin Pusat (`complaints.branch_id`, `sender_role`)
--   - Menu kategori produk dinamis (`product_categories`)
-- ============================================================================

USE adls_english_course;

-- 1. Tabel relasi tutor multi-cabang
CREATE TABLE IF NOT EXISTS tutor_branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tutor_id INT NOT NULL,
  branch_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tutor_branch (tutor_id, branch_id)
);

-- 2. Tabel kategori produk dinamis (#21)
CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Perubahan kolom pada tabel `classes` (#2 Type Kelas & #14 Standar Level)
SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'class_type'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE classes ADD COLUMN class_type VARCHAR(30) DEFAULT ''Regular'' AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE classes MODIFY COLUMN level VARCHAR(60) NULL;

-- 4. Perubahan kolom pada tabel `students` (#2 Type Kelas, #14 Level, #16 Sertifikat Kelulusan)
SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'class_type'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE students ADD COLUMN class_type VARCHAR(30) NULL AFTER class_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE students MODIFY COLUMN level VARCHAR(60) NULL;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'course_completed'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE students ADD COLUMN course_completed TINYINT(1) DEFAULT 0 AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'completed_at'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE students ADD COLUMN completed_at DATE NULL AFTER course_completed',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'certificate_delivery'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE students ADD COLUMN certificate_delivery VARCHAR(30) NULL AFTER completed_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'certificate_url'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE students ADD COLUMN certificate_url VARCHAR(255) NULL AFTER certificate_delivery',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'certificate_code'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE students ADD COLUMN certificate_code VARCHAR(80) NULL AFTER certificate_url',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Izinkan `learning_reports.material` NULL agar Admin Cabang dapat menyiapkan slot kolom nilai (#8)
ALTER TABLE learning_reports MODIFY COLUMN material VARCHAR(255) NULL;

-- 6. Lebarkan kolom level `audio_materials` (#14)
ALTER TABLE audio_materials MODIFY COLUMN level VARCHAR(60) NULL;

-- 7. Routing komplen tutor ke Admin Cabang & Admin Pusat (#13)
SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'user_id'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE complaints ADD COLUMN user_id INT NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'branch_id'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE complaints ADD COLUMN branch_id INT NULL AFTER user_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'sender_role'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE complaints ADD COLUMN sender_role VARCHAR(30) NULL AFTER branch_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. Backfill & seed data awal untuk tabel yang sudah ada
INSERT IGNORE INTO tutor_branches (tutor_id, branch_id)
SELECT DISTINCT tutor_id, branch_id
FROM classes
WHERE tutor_id IS NOT NULL AND branch_id IS NOT NULL;

UPDATE classes
SET class_type = COALESCE(NULLIF(TRIM(class_type), ''), name)
WHERE id > 0 AND (class_type IS NULL OR TRIM(class_type) = '');

UPDATE students s
INNER JOIN classes c ON c.id = s.class_id
SET s.class_type = COALESCE(NULLIF(TRIM(c.class_type), ''), c.name)
WHERE s.id > 0 AND (s.class_type IS NULL OR TRIM(s.class_type) = '') AND s.class_id IS NOT NULL;

UPDATE complaints c
INNER JOIN users u ON u.id = c.user_id
SET c.sender_role = COALESCE(c.sender_role, u.role),
    c.branch_id = COALESCE(c.branch_id, u.branch_id)
WHERE c.id > 0 AND (c.sender_role IS NULL OR c.branch_id IS NULL);

INSERT IGNORE INTO product_categories (name)
VALUES ('Buku'), ('Merchandise'), ('Perlengkapan Belajar');

INSERT IGNORE INTO product_categories (name)
SELECT DISTINCT TRIM(category)
FROM products
WHERE category IS NOT NULL AND TRIM(category) <> '';
