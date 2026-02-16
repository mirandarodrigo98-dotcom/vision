'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

export async function createProcess(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const type = formData.get('type') as string;
  const company_id = (formData.get('company_id') as string) || null;
  const razao_social_input_raw = (formData.get('razao_social') as string) || '';
  const razao_social_input = razao_social_input_raw.trim() ? razao_social_input_raw.trim().toUpperCase() : null;
  const nome_fantasia = formData.get('nome_fantasia') as string || null;
  const capital_social_centavos = formData.get('capital_social_centavos') ? Number(formData.get('capital_social_centavos')) : null;
  const socio_administrador = formData.get('socio_administrador') as string || null;
  const objeto_social = formData.get('objeto_social') as string || null;
  const telefone = formData.get('telefone') as string || null;
  const email = formData.get('email') as string || null;
  const observacao = formData.get('observacao') as string || null;
  const natureza_juridica = formData.get('natureza_juridica') as string || null;
  const porte = formData.get('porte') as string || null;
  const tributacao = formData.get('tributacao') as string || null;
  const inscricao_imobiliaria = formData.get('inscricao_imobiliaria') as string || null;
  const compl_cep = formData.get('compl_cep') as string || null;
  const compl_logradouro_tipo = formData.get('compl_logradouro_tipo') as string || null;
  const compl_logradouro = formData.get('compl_logradouro') as string || null;
  const compl_numero = formData.get('compl_numero') as string || null;
  const compl_complemento = formData.get('compl_complemento') as string || null;
  const compl_bairro = formData.get('compl_bairro') as string || null;
  const compl_municipio = formData.get('compl_municipio') as string || null;
  const compl_uf = formData.get('compl_uf') as string || null;

  if (!type || !['CONSTITUICAO','ALTERACAO','BAIXA'].includes(type)) {
    return { error: 'Tipo de processo inválido' };
  }
  if ((type === 'ALTERACAO' || type === 'BAIXA') && !company_id) {
    return { error: 'Empresa obrigatória para Alteração/Baixa.' };
  }

  const status = type === 'CONSTITUICAO' ? 'EM_ANDAMENTO' : 'NAO_INICIADO';
  const razao_social = type === 'CONSTITUICAO' ? (razao_social_input || null) : null;

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO societario_processes (
      id, type, status, company_id, razao_social, nome_fantasia, capital_social_centavos,
      socio_administrador, objeto_social, telefone, email, observacao, natureza_juridica, porte, tributacao,
      inscricao_imobiliaria, compl_cep, compl_logradouro_tipo, compl_logradouro, compl_numero,
      compl_complemento, compl_bairro, compl_municipio, compl_uf,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, type, status, company_id, razao_social, nome_fantasia, capital_social_centavos,
    socio_administrador, objeto_social, telefone, email, observacao, natureza_juridica, porte, tributacao,
    inscricao_imobiliaria, compl_cep, compl_logradouro_tipo, compl_logradouro, compl_numero,
    compl_complemento, compl_bairro, compl_municipio, compl_uf,
    session.user_id
  );

  const sociosByIndex: Record<string, any> = {};
  const cnaesByIndex: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    const strKey = String(key);
    if (strKey.startsWith('socio[')) {
      const match = strKey.match(/^socio\[(\d+)\]\[(.+)\]$/);
      if (match) {
        const idx = match[1];
        const field = match[2];
        if (!sociosByIndex[idx]) sociosByIndex[idx] = {};
        sociosByIndex[idx][field] = value;
      }
    }
    if (strKey.startsWith('cnaes[')) {
      const match = strKey.match(/^cnaes\[(\d+)\]\[(.+)\]$/);
      if (match) {
        const idx = match[1];
        const field = match[2];
        if (!cnaesByIndex[idx]) cnaesByIndex[idx] = {};
        cnaesByIndex[idx][field] = value;
      }
    }
  }

  const socioEntries = Object.values(sociosByIndex);
  for (const socio of socioEntries) {
    const socioId = randomUUID();
    const participacaoPercent =
      typeof socio.participacao_percent === 'string' && socio.participacao_percent
        ? Number(socio.participacao_percent)
        : null;
    await db.prepare(`
      INSERT INTO societario_process_socios (
        id, process_id, nome, cpf, rg, cnh, participacao_percent,
        cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf,
        natureza_evento, qualificacao, pais
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      socioId,
      id,
      socio.nome || null,
      socio.cpf || null,
      socio.rg || null,
      socio.cnh || null,
      participacaoPercent,
      socio.cep || null,
      socio.logradouro_tipo || null,
      socio.logradouro || null,
      socio.numero || null,
      socio.complemento || null,
      socio.bairro || null,
      socio.municipio || null,
      socio.uf || null,
      (socio.natureza_evento as string) || null,
      (socio.qualificacao as string) || null,
      (socio.pais as string) || null,
    );
  }

  const cnaeEntries = Object.values(cnaesByIndex);
  const principalCount = cnaeEntries.filter((cnae: any) => cnae.tipo === 'PRINCIPAL').length;
  if (principalCount > 1) {
    return { error: 'É permitido apenas uma atividade principal.' };
  }
  for (const cnae of cnaeEntries) {
    if (!cnae.code && !cnae.descricao) continue;
    const cnaeId = randomUUID();
    await db.prepare(`
      INSERT INTO societario_process_cnaes (
        id, process_id, cnae_code, cnae_desc
      ) VALUES (?, ?, ?, ?)
    `).run(
      cnaeId,
      id,
      cnae.code || null,
      cnae.descricao || null,
    );
  }

  revalidatePath('/admin/societario/processos');
  revalidatePath('/admin/societario');
  redirect('/admin/societario?tab=processos');
}

export async function getProcesses() {
  const session = await getSession();
  if (!session) return [];
  return await db.prepare(`
    SELECT sp.*, cc.razao_social as company_name, cc.cnpj as company_cnpj
    FROM societario_processes sp
    LEFT JOIN client_companies cc ON cc.id = sp.company_id
    ORDER BY sp.created_at DESC
  `).all();
}

export async function getProcessesFiltered(filters?: { company?: string; cnpj?: string; type?: string; status?: string }) {
  const session = await getSession();
  if (!session) return [];

  let query = `
    SELECT sp.*, cc.razao_social as company_name, cc.cnpj as company_cnpj
    FROM societario_processes sp
    LEFT JOIN client_companies cc ON cc.id = sp.company_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.company) {
    query += ` AND (sp.razao_social ILIKE ? OR cc.razao_social ILIKE ?)`;
    params.push(`%${filters.company}%`, `%${filters.company}%`);
  }
  if (filters?.cnpj) {
    query += ` AND (cc.cnpj ILIKE ? OR sp.company_cnpj ILIKE ?)`;
    params.push(`%${filters.cnpj}%`, `%${filters.cnpj}%`);
  }
  if (filters?.type && filters.type !== 'all') {
    query += ` AND sp.type = ?`;
    params.push(filters.type);
  }
  if (filters?.status && filters.status !== 'all') {
    query += ` AND sp.status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY sp.created_at DESC`;

  return await db.prepare(query).all(...params);
}

export async function getProcessById(id: string) {
  const session = await getSession();
  if (!session) return null;
  const proc = await db.prepare(`
    SELECT sp.*, cc.razao_social as company_name, cc.cnpj as company_cnpj
    FROM societario_processes sp
    LEFT JOIN client_companies cc ON cc.id = sp.company_id
    WHERE sp.id = ?
  `).get(id);
  if (!proc) return null;
  const socios = await db.prepare(`
    SELECT id, nome, cpf, rg, cnh, participacao_percent, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf,
           natureza_evento, qualificacao, pais
    FROM societario_process_socios
    WHERE process_id = ?
    ORDER BY id
  `).all(id);
  const cnaes = await db.prepare(`
    SELECT cnae_code as id, cnae_desc as descricao
    FROM societario_process_cnaes
    WHERE process_id = ?
    ORDER BY id
  `).all(id);
  return { process: proc, socios, cnaes };
}

export async function updateProcess(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  let hasPermission = session.role === 'admin' || session.role === 'operator';
  if (!hasPermission) {
    const perms = await db.prepare('SELECT permission FROM role_permissions WHERE role = ?').all(session.role) as { permission: string }[];
    hasPermission = perms.some(p => p.permission === 'societario.edit');
  }
  if (!hasPermission) return { error: 'Sem permissão.' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'ID obrigatório' };

  const type = formData.get('type') as string;
  const company_id = (formData.get('company_id') as string) || null;
  const razao_social_input_raw = (formData.get('razao_social') as string) || '';
  const razao_social_input = razao_social_input_raw.trim() ? razao_social_input_raw.trim().toUpperCase() : null;
  const nome_fantasia = formData.get('nome_fantasia') as string || null;
  const capital_social_centavos = formData.get('capital_social_centavos') ? Number(formData.get('capital_social_centavos')) : null;
  const socio_administrador = formData.get('socio_administrador') as string || null;
  const objeto_social = formData.get('objeto_social') as string || null;
  const telefone = formData.get('telefone') as string || null;
  const email = formData.get('email') as string || null;
  const observacao = formData.get('observacao') as string || null;
  const natureza_juridica = formData.get('natureza_juridica') as string || null;
  const porte = formData.get('porte') as string || null;
  const tributacao = formData.get('tributacao') as string || null;
  const inscricao_imobiliaria = formData.get('inscricao_imobiliaria') as string || null;
  const compl_cep = formData.get('compl_cep') as string || null;
  const compl_logradouro_tipo = formData.get('compl_logradouro_tipo') as string || null;
  const compl_logradouro = formData.get('compl_logradouro') as string || null;
  const compl_numero = formData.get('compl_numero') as string || null;
  const compl_complemento = formData.get('compl_complemento') as string || null;
  const compl_bairro = formData.get('compl_bairro') as string || null;
  const compl_municipio = formData.get('compl_municipio') as string || null;
  const compl_uf = formData.get('compl_uf') as string || null;

  if (!type || !['CONSTITUICAO','ALTERACAO','BAIXA'].includes(type)) {
    return { error: 'Tipo de processo inválido' };
  }
  if ((type === 'ALTERACAO' || type === 'BAIXA') && !company_id) {
    return { error: 'Empresa obrigatória para Alteração/Baixa.' };
  }

  const razao_social = type === 'CONSTITUICAO' ? (razao_social_input || null) : null;

  const exists = await db.prepare(`SELECT id FROM societario_processes WHERE id = ?`).get(id);
  if (!exists) return { error: 'Processo não encontrado.' };

  await db.prepare(`
    UPDATE societario_processes SET
      type = ?, status = CASE WHEN status = 'CONCLUIDO' THEN status ELSE 'EM_ANDAMENTO' END,
      company_id = ?, razao_social = ?, nome_fantasia = ?, capital_social_centavos = ?,
      socio_administrador = ?, objeto_social = ?, telefone = ?, email = ?, observacao = ?, natureza_juridica = ?, porte = ?, tributacao = ?,
      inscricao_imobiliaria = ?, compl_cep = ?, compl_logradouro_tipo = ?, compl_logradouro = ?, compl_numero = ?,
      compl_complemento = ?, compl_bairro = ?, compl_municipio = ?, compl_uf = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    type, company_id, razao_social, nome_fantasia, capital_social_centavos,
    socio_administrador, objeto_social, telefone, email, observacao, natureza_juridica, porte, tributacao,
    inscricao_imobiliaria, compl_cep, compl_logradouro_tipo, compl_logradouro, compl_numero,
    compl_complemento, compl_bairro, compl_municipio, compl_uf,
    id
  );

  await db.prepare(`DELETE FROM societario_process_socios WHERE process_id = ?`).run(id);
  await db.prepare(`DELETE FROM societario_process_cnaes WHERE process_id = ?`).run(id);

  const sociosByIndex: Record<string, any> = {};
  const cnaesByIndex: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    const strKey = String(key);
    if (strKey.startsWith('socio[')) {
      const match = strKey.match(/^socio\[(\d+)\]\[(.+)\]$/);
      if (match) {
        const idx = match[1];
        const field = match[2];
        if (!sociosByIndex[idx]) sociosByIndex[idx] = {};
        sociosByIndex[idx][field] = value;
      }
    }
    if (strKey.startsWith('cnaes[')) {
      const match = strKey.match(/^cnaes\[(\d+)\]\[(.+)\]$/);
      if (match) {
        const idx = match[1];
        const field = match[2];
        if (!cnaesByIndex[idx]) cnaesByIndex[idx] = {};
        cnaesByIndex[idx][field] = value;
      }
    }
  }

  const socioEntries = Object.values(sociosByIndex);
  for (const socio of socioEntries) {
    const socioId = randomUUID();
    const participacaoPercent =
      typeof socio.participacao_percent === 'string' && socio.participacao_percent
        ? Number(socio.participacao_percent)
        : null;
    await db.prepare(`
      INSERT INTO societario_process_socios (
        id, process_id, nome, cpf, rg, cnh, participacao_percent,
        cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf,
        natureza_evento, qualificacao, pais
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      socioId,
      id,
      socio.nome || null,
      socio.cpf || null,
      socio.rg || null,
      socio.cnh || null,
      participacaoPercent,
      socio.cep || null,
      socio.logradouro_tipo || null,
      socio.logradouro || null,
      socio.numero || null,
      socio.complemento || null,
      socio.bairro || null,
      socio.municipio || null,
      socio.uf || null,
      (socio.natureza_evento as string) || null,
      (socio.qualificacao as string) || null,
      (socio.pais as string) || null,
    );
  }

  const cnaeEntries = Object.values(cnaesByIndex);
  const principalCount = cnaeEntries.filter((cnae: any) => cnae.tipo === 'PRINCIPAL').length;
  if (principalCount > 1) {
    return { error: 'É permitido apenas uma atividade principal.' };
  }
  for (const cnae of cnaeEntries) {
    if (!cnae.code && !cnae.descricao) continue;
    const cnaeId = randomUUID();
    await db.prepare(`
      INSERT INTO societario_process_cnaes (
        id, process_id, cnae_code, cnae_desc
      ) VALUES (?, ?, ?, ?)
    `).run(
      cnaeId,
      id,
      cnae.code || null,
      cnae.descricao || null,
    );
  }

  revalidatePath('/admin/societario/processos');
  revalidatePath('/admin/societario');
  redirect('/admin/societario?tab=processos');
}

export async function concludeProcess(
  id: string,
  params: { contractDate: string; companyCode?: string; baixaDate?: string }
) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  let hasPermission = session.role === 'admin' || session.role === 'operator';
  if (!hasPermission) {
    const perms = await db
      .prepare('SELECT permission FROM role_permissions WHERE role = ?')
      .all(session.role) as { permission: string }[];
    hasPermission = perms.some((p) => p.permission === 'societario.edit');
  }
  if (!hasPermission) return { error: 'Sem permissão.' };

  if (!params.contractDate) {
    return { error: 'Data de registro do contrato é obrigatória.' };
  }

  const process = await db
    .prepare('SELECT * FROM societario_processes WHERE id = ?')
    .get(id) as any;
  if (!process) return { error: 'Processo não encontrado.' };

  if (process.type === 'CONSTITUICAO') {
    if (!params.companyCode) {
      return { error: 'Código da empresa é obrigatório para constituição.' };
    }
    const existingCode = await db
      .prepare('SELECT id FROM client_companies WHERE code = ?')
      .get(params.companyCode);
    if (existingCode) {
      return { error: 'Código de empresa já existente. Escolha outro código.' };
    }
    if (!process.company_id) {
      const newCompanyId = randomUUID();
      await db
        .prepare(
          `
          INSERT INTO client_companies (
          id, code, razao_social, nome, telefone, email_contato, capital_social_centavos,
            municipio, uf, address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `
        )
        .run(
          newCompanyId,
          params.companyCode,
          process.razao_social || null,
          process.nome_fantasia || null,
          process.telefone || null,
          process.email || null,
          process.capital_social_centavos ?? null,
          process.compl_municipio || null,
          process.compl_uf || null,
          process.compl_logradouro_tipo || null,
          process.compl_logradouro || null,
          process.compl_numero || null,
          process.compl_complemento || null,
          process.compl_bairro || null,
          process.compl_cep || null
        );
      await db.prepare(`
        INSERT INTO societario_company_history (
          id, company_id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, status, capital_social_centavos, snapshot_at, source
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'ATIVA', ?, datetime('now'), ?)
      `).run(
        randomUUID(),
        newCompanyId,
        params.companyCode,
        process.nome_fantasia || null,
        process.razao_social || null,
        process.telefone || null,
        process.email || null,
        process.compl_logradouro_tipo || null,
        process.compl_logradouro || null,
        process.compl_numero || null,
        process.compl_complemento || null,
        process.compl_cep || null,
        process.compl_bairro || null,
        process.compl_municipio || null,
        process.compl_uf || null,
        process.capital_social_centavos ?? null,
        'process_conclusion'
      );
      await db
        .prepare('UPDATE societario_processes SET company_id = ? WHERE id = ?')
        .run(newCompanyId, id);
      process.company_id = newCompanyId;
    }
  }

  if (process.type === 'ALTERACAO' && process.company_id) {
    await db
      .prepare(
        `
        UPDATE client_companies
        SET
          razao_social = COALESCE(?, razao_social),
          nome = COALESCE(?, nome),
          telefone = COALESCE(?, telefone),
          email_contato = COALESCE(?, email_contato),
          municipio = COALESCE(?, municipio),
          uf = COALESCE(?, uf),
          address_type = COALESCE(?, address_type),
          address_street = COALESCE(?, address_street),
          address_number = COALESCE(?, address_number),
          address_complement = COALESCE(?, address_complement),
          address_neighborhood = COALESCE(?, address_neighborhood),
          address_zip_code = COALESCE(?, address_zip_code),
          capital_social_centavos = COALESCE(?, capital_social_centavos),
          updated_at = datetime('now')
        WHERE id = ?
      `
      )
      .run(
        process.razao_social || null,
        process.nome_fantasia || null,
        process.telefone || null,
        process.email || null,
        process.compl_municipio || null,
        process.compl_uf || null,
        process.compl_logradouro_tipo || null,
        process.compl_logradouro || null,
        process.compl_numero || null,
        process.compl_complemento || null,
        process.compl_bairro || null,
        process.compl_cep || null,
        process.capital_social_centavos ?? null,
        process.company_id
      );
  }

  if (process.company_id) {
    const socios = await db
      .prepare(
        `
        SELECT nome, cpf, rg, cnh, participacao_percent, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf,
               natureza_evento
        FROM societario_process_socios
        WHERE process_id = ?
      `
      )
      .all(id);
    if (socios.length > 0) {
      const total = socios.reduce(
        (sum: number, s: any) => {
          if (s.natureza_evento === 'SAIDA') return sum;
          return sum + (s.participacao_percent ? Number(s.participacao_percent) : 0);
        },
        0
      );
      const rounded = Math.round(total * 100) / 100;
      if (rounded !== 100) {
        return { error: 'O total das participações dos sócios deve ser exatamente 100%.' };
      }
      const upsertSocioStmt = db.prepare(`
        INSERT INTO societario_socios (id, cpf, nome, data_nascimento, rg, cnh, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(cpf) DO UPDATE SET
          nome = excluded.nome,
          rg = excluded.rg,
          cnh = excluded.cnh,
          cep = excluded.cep,
          logradouro_tipo = excluded.logradouro_tipo,
          logradouro = excluded.logradouro,
          numero = excluded.numero,
          complemento = excluded.complemento,
          bairro = excluded.bairro,
          municipio = excluded.municipio,
          uf = excluded.uf,
          updated_at = datetime('now')
      `);
      const findSocioByCpfStmt = db.prepare(`SELECT id FROM societario_socios WHERE cpf = ?`);
      const upsertLinkStmt = db.prepare(`
        INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(company_id, socio_id) DO UPDATE SET
          participacao_percent = excluded.participacao_percent,
          updated_at = datetime('now')
      `);
      for (const s of socios as any[]) {
        const cpfDigits = String(s.cpf || '').replace(/\D/g, '');
        const socioIdExisting = await findSocioByCpfStmt.get(cpfDigits) as { id: string } | undefined;
        const socioId = socioIdExisting?.id || randomUUID();
        await upsertSocioStmt.run(
          socioId,
          cpfDigits,
          s.nome || '',
          s.rg || null,
          s.cnh || null,
          s.cep || null,
          s.logradouro_tipo || null,
          s.logradouro || null,
          s.numero || null,
          s.complemento || null,
          s.bairro || null,
          s.municipio || null,
          s.uf || null
        );
        const participacaoForLink =
          s.natureza_evento === 'SAIDA' ? 0 : Number(s.participacao_percent || 0);
        await upsertLinkStmt.run(
          randomUUID(),
          process.company_id,
          socioId,
          participacaoForLink
        );
      }
    }
  }

  if (process.type === 'ALTERACAO' && process.company_id) {
    await db.prepare(`
      INSERT INTO societario_company_history (
        id, company_id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, status, capital_social_centavos, snapshot_at, source
      )
      SELECT ?, cc.id, cc.code, cc.nome, cc.razao_social, cc.cnpj, cc.telefone, cc.email_contato, cc.address_type, cc.address_street, cc.address_number, cc.address_complement, cc.address_zip_code, cc.address_neighborhood, cc.municipio, cc.uf, cc.data_abertura, 'ATIVA', cc.capital_social_centavos, ?, ?
      FROM client_companies cc
      WHERE cc.id = ?
    `).run(
      randomUUID(),
      params.contractDate,
      'process_conclusion',
      process.company_id
    );
  }

  if (process.type === 'BAIXA' && !params.baixaDate) {
    return { error: 'Data da baixa é obrigatória para processos de baixa.' };
  }

  await db.prepare(
    `
    UPDATE societario_processes
    SET status = 'CONCLUIDO',
        contract_registration_date = ?,
        baixa_date = COALESCE(?, baixa_date),
        updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(params.contractDate, params.baixaDate || null, id);

  if (process.type === 'BAIXA' && process.company_id) {
    await db
      .prepare(`UPDATE client_companies SET is_active = 0, updated_at = datetime('now') WHERE id = ?`)
      .run(process.company_id);
    await db.prepare(`
      INSERT INTO societario_company_history (
        id, company_id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, status, capital_social_centavos, snapshot_at, source
      )
      SELECT ?, cc.id, cc.code, cc.nome, cc.razao_social, cc.cnpj, cc.telefone, cc.email_contato, cc.address_type, cc.address_street, cc.address_number, cc.address_complement, cc.address_zip_code, cc.address_neighborhood, cc.municipio, cc.uf, cc.data_abertura, 'INATIVA', cc.capital_social_centavos, datetime('now'), ?
      FROM client_companies cc
      WHERE cc.id = ?
    `).run(randomUUID(), 'process_conclusion', process.company_id);
  }

  revalidatePath('/admin/societario/processos');
  revalidatePath('/admin/societario');
  return { success: true };
}

export async function deleteProcess(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  // Permission: admin/operator or societario.edit
  let hasPermission = session.role === 'admin' || session.role === 'operator';
  if (!hasPermission) {
    const perms = await db.prepare('SELECT permission FROM role_permissions WHERE role = ?').all(session.role) as { permission: string }[];
    hasPermission = perms.some(p => p.permission === 'societario.edit');
  }
  if (!hasPermission) return { error: 'Sem permissão.' };

  const exists = await db.prepare(`SELECT id FROM societario_processes WHERE id = ?`).get(id);
  if (!exists) return { error: 'Processo não encontrado.' };

  try {
    const tx = db.transaction(async (processId: string) => {
      await db.prepare(`DELETE FROM societario_process_socios WHERE process_id = ?`).run(processId);
      await db.prepare(`DELETE FROM societario_process_cnaes WHERE process_id = ?`).run(processId);
      await db.prepare(`DELETE FROM societario_processes WHERE id = ?`).run(processId);
    });

    await tx(id);
  } catch (e: any) {
    console.error('Erro ao excluir processo societário:', e);
    return { error: 'Erro ao excluir processo.' };
  }

  revalidatePath('/admin/societario/processos');
  revalidatePath('/admin/societario');
  return { success: true };
}
