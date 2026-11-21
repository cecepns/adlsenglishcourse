-- Migration 009: Employee Attendance (Absensi Karyawan) with GPS and Camera Selfie
-- Roles: admin_pusat, admin_cabang, tutor, owner

CREATE TABLE IF NOT EXISTS employee_attendance_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(30) NOT NULL UNIQUE,
  work_start VARCHAR(10) NOT NULL DEFAULT '08:00',
  work_end VARCHAR(10) NOT NULL DEFAULT '17:00',
  late_tolerance_minutes INT NOT NULL DEFAULT 15,
  is_active TINYINT(1) DEFAULT 1,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO employee_attendance_settings (role, work_start, work_end, late_tolerance_minutes) VALUES
('default', '08:00', '17:00', 15),
('admin_pusat', '08:00', '17:00', 15),
('admin_cabang', '08:00', '17:00', 15),
('tutor', '08:00', '17:00', 15);

CREATE TABLE IF NOT EXISTS employee_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role VARCHAR(30) NOT NULL,
  branch_id INT NULL,
  date DATE NOT NULL,
  check_in_time VARCHAR(10) NULL,
  check_in_lat DECIMAL(10, 7) NULL,
  check_in_lng DECIMAL(10, 7) NULL,
  check_in_location VARCHAR(255) NULL,
  check_in_photo VARCHAR(255) NULL,
  check_in_status VARCHAR(20) DEFAULT 'on_time',
  late_minutes INT DEFAULT 0,
  check_in_notes TEXT NULL,
  check_out_time VARCHAR(10) NULL,
  check_out_lat DECIMAL(10, 7) NULL,
  check_out_lng DECIMAL(10, 7) NULL,
  check_out_location VARCHAR(255) NULL,
  check_out_photo VARCHAR(255) NULL,
  check_out_status VARCHAR(20) NULL,
  early_leave_minutes INT DEFAULT 0,
  check_out_notes TEXT NULL,
  work_duration_minutes INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'present',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_user_date (user_id, date)
);
