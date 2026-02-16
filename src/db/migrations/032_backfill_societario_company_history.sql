INSERT INTO societario_company_history (
  id,
  company_id,
  code,
  nome,
  razao_social,
  cnpj,
  telefone,
  email_contato,
  address_type,
  address_street,
  address_number,
  address_complement,
  address_zip_code,
  address_neighborhood,
  municipio,
  uf,
  data_abertura,
  status,
  capital_social_centavos,
  snapshot_at,
  source
)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)), 2) || '-' ||
         substr('AB89', 1 + (abs(random()) % 4), 1) ||
         substr(hex(randomblob(2)), 2) || '-' ||
         hex(randomblob(6))) AS id,
  cc.id AS company_id,
  cc.code,
  cc.nome,
  cc.razao_social,
  cc.cnpj,
  cc.telefone,
  cc.email_contato,
  cc.address_type,
  cc.address_street,
  cc.address_number,
  cc.address_complement,
  cc.address_zip_code,
  cc.address_neighborhood,
  cc.municipio,
  cc.uf,
  cc.data_abertura,
  CASE WHEN cc.is_active = 1 THEN 'ATIVA' ELSE 'INATIVA' END AS status,
  cc.capital_social_centavos,
  '2026-02-01T00:00:00' AS snapshot_at,
  'backfill_initial' AS source
FROM client_companies cc
LEFT JOIN societario_company_history sch
  ON sch.company_id = cc.id
WHERE sch.id IS NULL;

