ALTER TABLE societario_socios ADD COLUMN IF NOT EXISTS orgao_expedidor TEXT;
ALTER TABLE societario_socios ADD COLUMN IF NOT EXISTS uf_orgao_expedidor TEXT;
ALTER TABLE societario_socios ADD COLUMN IF NOT EXISTS data_expedicao TEXT;
