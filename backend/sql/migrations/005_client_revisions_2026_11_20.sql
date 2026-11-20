-- ============================================================================
-- Migration 005: Revisi Role Owner, Admin Pusat, & Admin Cabang
-- Tanggal: 2026-11-20
-- Aman & idempoten untuk MySQL 5.7 / 8.0+ dan MariaDB (XAMPP).
-- Mencakup:
--   1. Tabel Histori Perubahan Pricelist Siswa (student_pricelist_history)
--   2. Kolom Ukuran T-Shirt pada tabel `students` (students.tshirt_size)
--   3. Kolom Status Biaya Pendaftaran pada tabel `students` (students.registration_fee_status)
-- ============================================================================

-- 1. Tabel Histori Perubahan Pricelist Siswa per Bulan Efektif
CREATE TABLE IF NOT EXISTS student_pricelist_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  effective_month VARCHAR(7) NOT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_student_month (student_id, effective_month)
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

CALL AddColIfNotExists('students', 'tshirt_size', 'VARCHAR(20) NULL');
CALL AddColIfNotExists('students', 'registration_fee_status', "VARCHAR(30) DEFAULT 'paid'");

DROP PROCEDURE IF EXISTS AddColIfNotExists;
