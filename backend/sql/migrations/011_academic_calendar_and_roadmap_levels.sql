-- ============================================================================
-- Migration 011: Kalender Akademik ADLS & Learning Journey Roadmap Per Level
-- Tanggal: 2026-11-26
-- ============================================================================

-- 1. Tabel Kalender Akademik (dapat diedit oleh Owner & Admin Pusat)
CREATE TABLE IF NOT EXISTS academic_calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'event',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Pastikan tabel roadmap_templates mendukung uniq_level_meeting per level
CREATE TABLE IF NOT EXISTS roadmap_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
  meeting_number INT NOT NULL,
  topic VARCHAR(200) NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_level_meeting (level, meeting_number)
);
