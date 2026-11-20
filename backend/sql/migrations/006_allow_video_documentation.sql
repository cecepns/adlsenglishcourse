-- ============================================================================
-- Migration 006: Dukungan Upload Video Dokumentasi Kegiatan Kelas (Tutor ke Ortu)
-- Tanggal: 2026-11-20
-- Aman & idempoten untuk MySQL 5.7 / 8.0+ dan MariaDB (XAMPP).
-- ============================================================================

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

-- Tambah kolom media_type ('photo' / 'video') pada class_activity_photos
CALL AddColIfNotExists('class_activity_photos', 'media_type', "VARCHAR(20) DEFAULT 'photo'");

-- Update record yang sudah ada: jika url berakhiran format video, set media_type = 'video'
UPDATE class_activity_photos
SET media_type = 'video'
WHERE photo_url REGEXP '\\.(mp4|webm|mov|ogg)($|\\?)' AND (media_type IS NULL OR media_type = 'photo');

DROP PROCEDURE IF EXISTS AddColIfNotExists;
