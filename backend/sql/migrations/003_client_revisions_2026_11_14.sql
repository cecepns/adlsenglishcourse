-- ============================================================================
-- Migration 003: Revisi Lanjutan Client ADLS (Kas Mini, Foto Kelas, Backup Tutor, Timetable)
-- Tanggal: 2026-11-14
-- Aman & idempoten untuk MySQL 5.7 / 8.0+ dan MariaDB (XAMPP).
-- ============================================================================

-- 1. Tabel Foto Dokumentasi Aktivitas Kelas (Laporan Nyata ke Orang Tua)
CREATE TABLE IF NOT EXISTS class_activity_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  branch_id INT NULL,
  tutor_id INT NOT NULL,
  session_date DATE NOT NULL,
  session_time VARCHAR(30) NULL,
  photo_url VARCHAR(255) NOT NULL,
  attendance_summary VARCHAR(150) NULL,
  material VARCHAR(255) NULL,
  homework VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Tutor Pengganti (Backup Tutor Assignment)
CREATE TABLE IF NOT EXISTS tutor_substitutes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  branch_id INT NULL,
  original_tutor_id INT NOT NULL,
  backup_tutor_id INT NOT NULL,
  substitute_date DATE NOT NULL,
  reason VARCHAR(255) NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  notes TEXT NULL,
  created_by INT NULL,
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

-- 3. Kolom Tambahan untuk Kas Mini / POS di `product_orders`
CALL AddColIfNotExists('product_orders', 'is_direct_payment', 'TINYINT(1) DEFAULT 1');
CALL AddColIfNotExists('product_orders', 'amount_paid', 'DECIMAL(12,2) DEFAULT 0');
CALL AddColIfNotExists('product_orders', 'payment_method', 'VARCHAR(50) DEFAULT "Cash"');
CALL AddColIfNotExists('product_orders', 'cashier_name', 'VARCHAR(100) NULL');
CALL AddColIfNotExists('product_orders', 'tax_amount', 'DECIMAL(12,2) DEFAULT 0');
CALL AddColIfNotExists('product_orders', 'extra_fee', 'DECIMAL(12,2) DEFAULT 0');
CALL AddColIfNotExists('product_orders', 'discount_amount', 'DECIMAL(12,2) DEFAULT 0');
CALL AddColIfNotExists('product_orders', 'transaction_date', 'DATETIME NULL');

DROP PROCEDURE IF EXISTS AddColIfNotExists;
