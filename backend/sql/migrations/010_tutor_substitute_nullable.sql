-- Migration 010: Ensure backup_tutor_id in tutor_substitutes can be NULL
-- Digunakan untuk fitur permohonan tutor backup saat tutor berhalangan hadir

ALTER TABLE tutor_substitutes MODIFY backup_tutor_id INT NULL DEFAULT NULL;
