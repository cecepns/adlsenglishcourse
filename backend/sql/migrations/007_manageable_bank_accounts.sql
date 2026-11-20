-- ============================================================================
-- Migration 007: Kelola Rekening Resmi Pembayaran SPP (Manageable Bank Accounts)
-- Rekening default diubah menjadi 1 rekening resmi:
-- Bank: BSI, No Rekening: 7239458167, Atas Nama: PT. Adls Solusi Indonesia
-- Tanggal: 2026-11-20
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_name VARCHAR(60) NOT NULL,
  account_number VARCHAR(60) NOT NULL,
  account_holder VARCHAR(120) NOT NULL,
  company_name VARCHAR(120) NULL DEFAULT 'PT. Adls Solusi Indonesia',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bersihkan rekening dummy / lama jika ada
DELETE FROM bank_accounts WHERE bank_name IN ('BCA', 'Mandiri') AND account_number IN ('1234-567-890', '130-00-9876543-2');

-- Pastikan rekening resmi BSI terdaftar
INSERT INTO bank_accounts (bank_name, account_number, account_holder, company_name, is_active)
SELECT 'BSI', '7239458167', 'PT. Adls Solusi Indonesia', 'PT. Adls Solusi Indonesia', 1
WHERE NOT EXISTS (
  SELECT 1 FROM bank_accounts WHERE bank_name = 'BSI' AND account_number = '7239458167'
);
