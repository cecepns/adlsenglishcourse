-- ============================================================================
-- Migration 008: Placement Test CBT & Video Speaking Before-After Progres Bulanan
-- Tanggal: 2026-11-21
-- ============================================================================

-- 1. Tabel Bank Soal Placement Test (Pilihan Ganda & Speaking)
CREATE TABLE IF NOT EXISTS placement_test_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_number INT NOT NULL DEFAULT 1,
  question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice', -- 'multiple_choice' | 'speaking'
  question_text TEXT NOT NULL,
  image_url VARCHAR(255) NULL,
  audio_url VARCHAR(255) NULL,
  option_a TEXT NULL,
  option_b TEXT NULL,
  option_c TEXT NULL,
  option_d TEXT NULL,
  correct_option VARCHAR(5) NULL, -- 'A', 'B', 'C', 'D'
  level VARCHAR(60) NULL DEFAULT 'General',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel Hasil Pengerjaan Placement Test Calon Murid Baru
CREATE TABLE IF NOT EXISTS placement_test_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_name VARCHAR(120) NOT NULL,
  candidate_phone VARCHAR(30) NULL,
  candidate_email VARCHAR(100) NULL,
  branch_id INT NULL,
  school_origin VARCHAR(120) NULL,
  school_grade VARCHAR(40) NULL,
  age_or_level VARCHAR(60) NULL,
  student_id INT NULL,
  user_id INT NULL,
  answers_json LONGTEXT NULL,
  pg_score DECIMAL(5,2) DEFAULT 0,
  total_correct INT DEFAULT 0,
  total_pg INT DEFAULT 20,
  speaking_video_url VARCHAR(255) NULL,
  speaking_score DECIMAL(5,2) NULL,
  assessor_id INT NULL,
  assessor_notes TEXT NULL,
  recommended_level VARCHAR(60) NULL,
  status VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'graded', 'enrolled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Tabel Video Progres Speaking Siswa (Before - After Bulanan)
CREATE TABLE IF NOT EXISTS student_speaking_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'after', -- 'before' (awal masuk) | 'after' (progres bulanan)
  month VARCHAR(7) NULL, -- 'YYYY-MM'
  period_label VARCHAR(100) NULL, -- 'Before (Awal Masuk)', 'Bulan ke-1', 'Bulan ke-2', dll
  title VARCHAR(150) NOT NULL,
  video_url VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(255) NULL,
  notes TEXT NULL,
  speaking_score INT NULL,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed 20 Soal PG + 1 Soal Speaking jika tabel masih kosong
INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 1, 'multiple_choice', 'Complete the sentence: "Hello! My name _____ Alex. Nice to meet you."', 'am', 'is', 'are', 'be', 'B', 'Preschool (Pre A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 1);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 2, 'multiple_choice', 'Choose the correct plural form: "There are two _____ in the park."', 'childs', 'children', 'childes', 'child', 'B', 'Preschool (Pre A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 2);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 3, 'multiple_choice', 'What color is a ripe banana?', 'Blue', 'Yellow', 'Purple', 'Black', 'B', 'Preschool (Pre A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 3);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 4, 'multiple_choice', 'Which animal can fly in the sky?', 'Elephant', 'Bird', 'Fish', 'Rabbit', 'B', 'Preschool (Pre A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 4);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 5, 'multiple_choice', 'Complete the sentence: "She _____ to school by bicycle every morning."', 'go', 'goes', 'going', 'gone', 'B', 'Basic (A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 5);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 6, 'multiple_choice', 'Choose the correct preposition: "Our English class starts _____ 09.00 AM."', 'in', 'on', 'at', 'to', 'C', 'Basic (A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 6);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 7, 'multiple_choice', 'Identify the opposite of the word "HAPPY":', 'Sad', 'Angry', 'Brave', 'Excited', 'A', 'Basic (A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 7);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 8, 'multiple_choice', 'Complete the question: "_____ do you live?" - "I live in Cikarang."', 'When', 'Where', 'Who', 'Why', 'B', 'Basic (A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 8);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 9, 'multiple_choice', '"They _____ playing basketball in the backyard right now."', 'is', 'are', 'was', 'were', 'B', 'Basic (A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 9);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 10, 'multiple_choice', '"Yesterday, my family and I _____ a delicious pizza for dinner."', 'eat', 'eats', 'ate', 'eating', 'C', 'Basic (A1)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 10);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 11, 'multiple_choice', 'Comparison: "An airplane is _____ than a motorcycle."', 'fast', 'faster', 'more fast', 'fastest', 'B', 'Intermediate (A2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 11);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 12, 'multiple_choice', '"I have lived in this city _____ 2018."', 'since', 'for', 'during', 'from', 'A', 'Intermediate (A2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 12);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 13, 'multiple_choice', '"If it _____ tomorrow, we will stay at home and watch movies."', 'rain', 'rains', 'rained', 'will rain', 'B', 'Intermediate (A2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 13);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 14, 'multiple_choice', '"While Sarah was reading a novel, the phone suddenly _____."', 'ring', 'rang', 'ringing', 'was rung', 'B', 'Intermediate (A2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 14);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 15, 'multiple_choice', '"Could you please tell me how to _____ to the nearest bookstore?"', 'getting', 'get', 'got', 'arrived', 'B', 'Intermediate (A2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 15);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 16, 'multiple_choice', '"The teacher asked the students to _____ their homework before Friday."', 'submit', 'submits', 'submitting', 'submitted', 'A', 'Advance (B1 - B2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 16);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 17, 'multiple_choice', '"Although the examination was quite challenging, most students _____ good grades."', 'achieved', 'failed', 'refused', 'rejected', 'A', 'Advance (B1 - B2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 17);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 18, 'multiple_choice', '"The magnificent bridge was _____ by skilled engineers two years ago."', 'built', 'build', 'building', 'builds', 'A', 'Advance (B1 - B2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 18);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 19, 'multiple_choice', '"You look very exhausted after the journey. You _____ take some rest."', 'should', 'must to', 'ought', 'better to', 'A', 'Advance (B1 - B2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 19);

INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 20, 'multiple_choice', 'Read: "ADLS English Course empowers students to speak English with confidence and fluency through practical conversation sessions." What is the main objective of ADLS?', 'To build confident and fluent English speaking skills', 'To conduct silent grammar exams only', 'To memorize entire dictionary books', 'To stop students from speaking in public', 'A', 'Advance (B1 - B2)', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 20);

-- Soal 21: Speaking Task (Upload Video Speaking Calon Murid)
INSERT INTO placement_test_questions (question_number, question_type, question_text, option_a, option_b, option_c, option_d, correct_option, level, is_active)
SELECT 21, 'speaking', 'Speaking Test: Rekam video berdurasi 1 - 2 menit berbicara dalam bahasa Inggris. Perkenalkan diri Anda (Nama lengkap, nama panggilan, usia, asal sekolah / pekerjaan, hobi, dan alasan ingin belajar bahasa Inggris di ADLS English Course). Unggah file video Anda di bawah ini.', NULL, NULL, NULL, NULL, NULL, 'Speaking Test', 1
WHERE NOT EXISTS (SELECT 1 FROM placement_test_questions WHERE question_number = 21);
