export async function getZenCategories(config: QuestorZenConfig) {
  const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/categorias`;
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`Erro ao buscar categorias do Zen: ${res.status}`);
  return await res.json();
}

export async function findZenCategoryByNames(config: QuestorZenConfig, moduleName: string, categoryName: string) {
  const categories = await getZenCategories(config);
  for (const module of categories) {
    if (module.Descricao?.toLowerCase() === moduleName.toLowerCase() || !moduleName) {
      for (const cat of module.Categorias || []) {
        if (cat.Descricao?.toLowerCase() === categoryName.toLowerCase()) {
          return cat.Codigo;
        }
      }
    }
  }
  return null;
}

export async function uploadToZen(config: QuestorZenConfig, filename: string, content: string | Buffer) {
  const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/upload/${encodeURIComponent(filename)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: content
  });
  if (!res.ok) throw new Error(`Erro ao fazer upload no Zen: ${res.status}`);
  return await res.json(); // returns the fileId (string)
}

export async function getZenClientByCnpj(config: QuestorZenConfig, cnpj: string) {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/clientes/${cleanCnpj}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`Erro ao buscar cliente no Zen: ${res.status}`);
  const data = await res.json();
  if (data && data.CodigoCliente) {
    return data.CodigoCliente;
  }
  return null;
}

export async function sendDocumentToZen(params: {
  cnpj: string,
  filename: string,
  content: string | Buffer,
  moduleName?: string,
  categoryName: string,
  title: string,
  observation?: string,
  attributes?: any
}) {
  const config = await getQuestorZenConfig();
  if (!config) throw new Error('Questor ZEN não configurado');

  const clientId = await getZenClientByCnpj(config, params.cnpj);
  if (!clientId) throw new Error(`Cliente CNPJ ${params.cnpj} não encontrado no Questor ZEN.`);

  let categoryId = await findZenCategoryByNames(config, params.moduleName || '', params.categoryName);
  if (!categoryId && params.categoryName === 'Variáveis') {
      // Fallback para 'Documentos' em 'Departamento Pessoal'
      categoryId = await findZenCategoryByNames(config, 'Departamento Pessoal', 'Documentos');
  }
  if (!categoryId) throw new Error(`Categoria ${params.categoryName} não encontrada no Questor ZEN.`);

  const fileId = await uploadToZen(config, params.filename, params.content);

  const payload = {
    CodigoCategoria: categoryId,
    CodigoCliente: clientId,
    CodigoArquivo: fileId,
    Titulo: params.title,
    Observacao: params.observation || '',
    Atributo: params.attributes || {}
  };

  const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/documentos`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro ao enviar documento para o ZEN: ${errorText}`);
  }

  const documentId = await res.text(); // Return format is just the ID string like "628e58304f284c109c67cf15"
  return documentId.replace(/"/g, '');
}