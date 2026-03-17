'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { fetchQuestorZenCompany } from './questor-zen';
import { executeQuestorProcess } from './questor-syn';

const parseQuestorNumber = (val: any): number => {
    if (!val) return 0;
    let numStr = String(val).trim();
    
    // Remove R$ or similar
    numStr = numStr.replace(/^R\$\s?/, '');

    // Check format
    if (numStr.includes(',') && numStr.includes('.')) {
        // Brazilian format with thousands separator: 1.000,00
        // OR US format with thousands separator: 1,000.00
        // Heuristic: check last occurrence
        const lastDot = numStr.lastIndexOf('.');
        const lastComma = numStr.lastIndexOf(',');
        
        if (lastComma > lastDot) {
            // 1.000,00 -> Remove dots, replace comma with dot
            numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,000.00 -> Remove commas
            numStr = numStr.replace(/,/g, '');
        }
    } else if (numStr.includes(',')) {
        // 1000,00 -> 1000.00
        numStr = numStr.replace(',', '.');
    }
    
    // Final cleanup of any non-numeric chars except dot
    numStr = numStr.replace(/[^\d.]/g, '');
    
    return parseFloat(numStr) || 0;
};

export interface QuestorCompanyData {
  company: {
    code: string;
    name: string;
    razao_social: string;
    cnpj: string;
    data_abertura?: string;
    email?: string;
    telefone?: string;
    capital_social?: number;
    filial?: string;
  };
  address: {
    tipo_logradouro?: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string; // NOMEMUNIC
    uf: string; // SIGLAESTADO
    cep: string;
  };
  socios: QuestorSocioData[];
  source: 'zen' | 'syn';
  raw?: any; // To store raw data from Questor
}

export interface QuestorSocioData {
  nome: string;
  cpf: string;
  percentual: number;
  data_nascimento?: string;
  rg?: string;
  orgao_expedidor?: string;
  uf_orgao_expedidor?: string;
  data_expedicao?: string;
  // Address for socio
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  is_representative?: boolean;
}

export async function fetchCompanyFromQuestor(identifier: string, source: 'zen' | 'syn') {
  try {
    let normalizedData: QuestorCompanyData | null = null;

    if (source === 'zen') {
      const cleanCode = identifier.replace(/\D/g, '');
      if (cleanCode.length < 11) {
        return { error: 'Para integração com Questor Zen, é necessário informar o CNPJ completo (14 dígitos).' };
      }
      
      const result = await fetchQuestorZenCompany(identifier);
      if (result.error) return { error: result.error };
      
      normalizedData = normalizeZenData(result.data, identifier);
    } else {
      // SYN Integration via Custom Process (Questor Vision Routines)
      // Uses the same pattern as Employee Import to avoid permission errors
      
      // Routine 1: Company Data
      // Requires a configured Questor Routine named 'EmpresasVision'
      const companyRoutine = 'EmpresasVision';
      const companyResult = await executeQuestorProcess(companyRoutine, {
          "E.CODIGOEMPRESA": identifier
      });

      if (companyResult.error) {
        return { error: `Erro ao buscar empresa: ${companyResult.error}` };
      }

      const companies = companyResult.data as any[];
      if (!companies || companies.length === 0) {
         return { error: `Empresa não encontrada (Cód: ${identifier}). Verifique se o código está correto e se a rotina ${companyRoutine} está configurada.` };
      }
      
      const companyRow = companies[0];

      const cleanQuestorString = (val: any) => {
        if (!val) return '';
        let str = String(val);
        // Decode HTML entities
        str = str.replace(/&nbsp;/g, ' ')
                 .replace(/&nbsp/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 // Handle potential double encoding or weird variations
                 .replace(/&amp;nbsp;/g, ' ')
                 .replace(/&NBSP;/g, ' ')
                 .replace(/&NBSP/g, ' ');
        // Normalize whitespace
        return str.replace(/\s+/g, ' ').trim();
      };

      const normalizeString = cleanQuestorString;

      // Helper to get field case-insensitive and with aliases
      const get = (obj: any, keys: string[]) => {

        if (!obj) return undefined;
        
        for (const key of keys) {
            // 1. Direct match
            if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
            
            // 2. Case-insensitive match
            const lower = key.toLowerCase();
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lower);
            if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && String(obj[foundKey]).trim() !== '') return obj[foundKey];

            // 3. Prefix match (e.g. E.CODIGOEMPRESA matching CODIGOEMPRESA)
            // This is useful if the SQL returns E.FIELD but we are looking for FIELD
            const foundSuffixKey = Object.keys(obj).find(k => k.toLowerCase().endsWith('.' + lower));
            if (foundSuffixKey && obj[foundSuffixKey] !== undefined && obj[foundSuffixKey] !== null && String(obj[foundSuffixKey]).trim() !== '') return obj[foundSuffixKey];
        }
        return undefined;
      };

      // Try to extract Socios from the main result (if it's a joined query)
      // Check if NOME_SOCIO (or alias) exists in the first row
      let socios: QuestorSocioData[] = [];
      const hasSocioInfo = get(companyRow, ['NOME_SOCIO', 'NOMESOCIO', 'SOCIO_NOME']);

      if (hasSocioInfo) {
          // Extract unique socios from the joined result
          const socioMap = new Map<string, QuestorSocioData>();
          
          companies.forEach((row: any) => {
              const cpf = normalizeString(get(row, ['CPF', 'INSCRFEDERAL', 'CPF_SOCIO', 'CNPJ_SOCIO']));
              if (!cpf) return;

              if (!socioMap.has(cpf)) {
                  socioMap.set(cpf, {
                      nome: normalizeString(get(row, ['NOME_SOCIO', 'NOMESOCIO', 'SOCIO_NOME'])),
                      cpf: cpf,
                      percentual: parseQuestorNumber(get(row, ['PARTICIPACAO', 'PERCENTCOTAS', 'PERCPARTICIPACAO', 'PERCENTUAL'])),
                      data_nascimento: get(row, ['DATANASC', 'DATA_NASCIMENTO']),
                      rg: get(row, ['NUMERORG', 'RG']),
                      orgao_expedidor: get(row, ['ORGAOEXPEDIDOR']),
                      uf_orgao_expedidor: get(row, ['UFEXPEDIDOR', 'UFORGAOEXPEDIDOR']),
                      data_expedicao: get(row, ['DATAEXPEDICAO']),
                      cep: get(row, ['CEP_SOCIO', 'CEPSOCIO']),
                      logradouro: get(row, ['LOGRADOURO_SOCIO', 'ENDERECOSOCIO']),
                      numero: get(row, ['NUMERO_SOCIO', 'NUMEROSOCIO']),
                      complemento: get(row, ['COMPLEMENTO_SOCIO', 'COMPLEMENTOSOCIO']),
                      bairro: get(row, ['BAIRRO_SOCIO', 'BAIRROSOCIO']),
                      municipio: get(row, ['MUNICIPIO_SOCIO', 'CIDADESOCIO']),
                      uf: get(row, ['UF_SOCIO', 'UFSOCIO']),
                      is_representative: normalizeString(get(row, ['ADMINISTRADOR', 'RESPLEGAL'])) === 'S'
                  });
              }
          });
          socios = Array.from(socioMap.values());
      } else {
          // Fallback to separate Socios Routine
          // Routine 2: Socios Data
          // Requires a configured Questor Routine named 'SociosVision'
          const sociosRoutine = 'SociosVision';
          const sociosResult = await executeQuestorProcess(sociosRoutine, {
              "E.CODIGOEMPRESA": identifier
          });
          
          const sociosRows = (sociosResult.data || []) as any[];

          // Normalize Data directly here
          socios = sociosRows.map((s: any) => ({
            nome: s.NOMESOCIO || '',
            cpf: s.INSCRFEDERAL || '', // CPF/CNPJ
            percentual: parseQuestorNumber(s.PERCPARTICIPACAO),
            data_nascimento: s.DATANASC,
            rg: s.NUMERORG,
            orgao_expedidor: s.ORGAOEXPEDIDOR,
            uf_orgao_expedidor: s.UFEXPEDIDOR,
            data_expedicao: s.DATAEXPEDICAO,
            cep: s.CEP,
            logradouro: s.LOGRADOURO,
            numero: s.NUMERO,
            complemento: s.COMPLEMENTO,
            bairro: s.BAIRRO,
            municipio: s.NOMEMUNIC,
            uf: s.SIGLAESTADO
          }));
      }

      // Clean all raw values for display
      const cleanRaw: any = {};
      if (companyRow) {
          Object.keys(companyRow).forEach(key => {
              cleanRaw[key] = cleanQuestorString(companyRow[key]);
          });
      }

      // Helper to extract street type from address if missing
      const extractStreetType = (address: string) => {
          if (!address) return { type: '', street: '' };
          const types = ['RUA', 'AVENIDA', 'AV', 'ALAMEDA', 'RODOVIA', 'ESTRADA', 'SERVIDAO', 'TRAVESSA', 'PRACA', 'PC', 'LAGO', 'SITIO', 'FAZENDA', 'VIA', 'VIADUTO', 'TREVO', 'EST', 'ROD'];
          const upper = address.toUpperCase();
          for (const t of types) {
              if (upper.startsWith(t + ' ')) {
                  return {
                      type: t,
                      street: address.substring(t.length).trim()
                  };
              }
          }
          return { type: '', street: address };
      };

      // 1. Get raw values
      let tipoLogradouro = normalizeString(get(companyRow, ['DESCRTIPOLOGRAD', 'TIPOLOGRADOURO', 'TIPO_LOGRADOURO', 'DS_TIPO_LOGRADOURO', 'TIPOLOGRAD', 'DS_TIPO', 'DSTIPOLOGRADOURO', 'TIPO', 'TIPOLOG', 'DSTIPOLOGRAD', 'DESCRICAOTIPO', 'TIPOENDERECO', 'TIPO_ENDERECO', 'DS_TIPO_LOGRAD', 'DS_TP_LOGRADOURO', 'TP_LOGRADOURO', 'NM_TIPO_LOGRADOURO', 'DESCRICAO_TIPO_LOGRADOURO', 'TIPO_LOGRAD', 'TP_LOGRAD']));
      let logradouro = normalizeString(get(companyRow, ['LOGRADOURO', 'ENDERECO', 'RUA', 'NM_LOGRADOURO', 'DESCRLOGRADOURO', 'NOMELOGRADOURO', 'ENDERECOCORRESP', 'DS_LOGRADOURO', 'DS_ENDERECO', 'DESCRLOGRAD', 'LOGRAD', 'AVENIDA', 'NM_ENDERECO', 'ENDERECOESTAB', 'DS_ENDERECO_ESTAB']));

      // 2. Smart extraction if type is missing
      if (!tipoLogradouro && logradouro) {
          const extracted = extractStreetType(logradouro);
          if (extracted.type) {
              tipoLogradouro = extracted.type;
              // Keep original logradouro as fallback, or use stripped?
              // Let's use stripped to avoid duplication like "RUA RUA DAS FLORES"
              logradouro = extracted.street;
          }
      }

      normalizedData = {
        company: {
            code: normalizeString(get(companyRow, ['CODIGOEMPRESA', 'CODIGO'])),
            name: normalizeString(get(companyRow, ['NOMEEMPRESA', 'FANTASIA', 'NOMEFANTASIA', 'NOME'])),
            filial: normalizeString(get(companyRow, ['CODIGOESTAB', 'FILIAL', 'CD_FILIAL'])),
            // Fallback chain for Razão Social: Razão Social -> Nome Completo -> Nome Empresa -> Fantasia -> Nome
            razao_social: normalizeString(get(companyRow, ['RAZAOSOCIAL', 'RAZAO', 'NOMECOMPLETO', 'NOMEESTABCOMPLETO'])) || 
                          normalizeString(get(companyRow, ['NOMEEMPRESA', 'NOME'])) ||
                          normalizeString(get(companyRow, ['FANTASIA', 'NOMEFANTASIA'])),
            cnpj: normalizeString(get(companyRow, ['INSCRFEDERAL', 'CNPJ', 'CGC', 'CPFCNPJ'])),
            data_abertura: get(companyRow, ['DATAINICIOATIV', 'DATAABERTURA', 'INICIOATIVIDADES']),
            email: normalizeString(get(companyRow, ['EMAIL', 'EMAILCONTATO', 'PAGINA', 'SITE', 'EMAIL1', 'DS_EMAIL', 'MAIL', 'EMAIL_PRINCIPAL', 'EMAIL_NFE', 'ENDERECOELETRONICO', 'EMAILDPO'])),
            telefone: (() => {
                const ddd = normalizeString(get(companyRow, ['DDDFONE', 'DDD', 'NR_DDD', 'DDD_FONE']));
                const num = normalizeString(get(companyRow, ['NUMEROFONE', 'TELEFONE', 'FONE', 'CELULAR', 'NR_FONE', 'NR_TELEFONE', 'TELEFONE1']));
                return num ? (ddd ? `${ddd}${num}` : num) : undefined;
            })(),
            capital_social: parseQuestorNumber(get(companyRow, ['CAPITALSOCIAL', 'CAPITAL', 'VALORCAPITAL', 'VLR_CAPITAL_SOCIAL', 'VL_CAPITAL', 'VALOR_CAPITAL', 'CAPITAL_SOCIAL', 'VLR_CAPITAL', 'CAPITAL_INTEGRALIZADO', 'VLR_CAPITAL_SOCIAL_ATUAL']))
        },
        address: {
            tipo_logradouro: tipoLogradouro,
            logradouro: logradouro,
            numero: normalizeString(get(companyRow, ['NUMERO', 'NUM', 'NR_ENDERECO', 'NUMEROENDERECO', 'NUMEROEND', 'NR_IMOVEL', 'NRO', 'NUMERO_IMOVEL', 'NR', 'NUMENDERESTAB'])),
            complemento: normalizeString(get(companyRow, ['COMPLEMENTO', 'COMPL', 'DS_COMPLEMENTO', 'COMPLEMENTOENDERECO', 'CPL', 'COMPLEMENTO_ENDERECO', 'COMPLENDERESTAB'])),
            bairro: normalizeString(get(companyRow, ['BAIRRO', 'NM_BAIRRO', 'NOMEBAIRRO', 'DESCRBAIRRO', 'BAIRROEND', 'DS_BAIRRO', 'NO_BAIRRO', 'NOME_BAIRRO', 'BAIRROENDERESTAB'])),
            cidade: normalizeString(get(companyRow, ['NOMEMUNIC', 'CIDADE', 'MUNICIPIO', 'NM_CIDADE', 'NOMEMUNICIPIO', 'CIDADEEND', 'DS_CIDADE', 'DS_MUNICIPIO'])),
            uf: normalizeString(get(companyRow, ['SIGLAESTADO', 'UF', 'ESTADO', 'SG_UF', 'SIGLAUF', 'UFEND'])),
            cep: normalizeString(get(companyRow, ['CEP', 'NR_CEP', 'CEPEND', 'CODIGO_POSTAL', 'ZIP', 'CEP_ENDERECO', 'CODIGOPOSTAL', 'CEPENDERESTAB']))
        },
        socios: socios,
        source: 'syn',
        raw: cleanRaw
      };
    }

    if (!normalizedData) {
        return { error: 'Falha ao normalizar dados da empresa.' };
    }

    // 2. Check existence in Vision DB
    // Check by CNPJ (if available) or Code
    let existing = null;
    
    if (normalizedData.company.cnpj) {
        existing = await db.prepare(`
            SELECT id, nome, code, cnpj FROM client_companies 
            WHERE cnpj = ?
        `).get(normalizedData.company.cnpj) as any;
    }

    // If not found by CNPJ, try by Code (only if using SYN/Code as identifier, but code is not unique across systems...)
    // Actually, Code in Vision is usually the Questor Code.
    if (!existing && normalizedData.company.code) {
        existing = await db.prepare(`
            SELECT id, nome, code, cnpj FROM client_companies 
            WHERE code = ?
        `).get(normalizedData.company.code) as any;
    }

    // Check permissions for existing company
    if (existing) {
        const session = await getSession();
        if (session && session.role === 'operator') {
            const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, existing.id);
            if (restricted) {
                return { error: 'Sem permissão para acessar esta empresa (restrita).' };
            }
        }
    }

    return { 
        success: true, 
        data: normalizedData,
        existing: existing ? {
            id: existing.id,
            nome: existing.nome,
            cnpj: existing.cnpj,
            code: existing.code
        } : undefined
      };
    }

  } catch (error: any) {
    console.error('Fetch Company Error:', error);
    return { error: error.message || 'Erro ao buscar empresa no Questor.' };
  }
}

function normalizeZenData(zenData: any, identifier: string): QuestorCompanyData {
    const rawSocios = zenData.Socios || zenData.socios || [];
    
    const socios: QuestorSocioData[] = Array.isArray(rawSocios) ? rawSocios.map((s: any) => ({
        nome: s.Nome || s.nome,
        cpf: s.Cpf || s.cpf || s.cpfCnpj || s.InscricaoFederal,
        percentual: parseQuestorNumber(s.Percentual || s.participacao || '0'),
        // Zen might provide address for socios, but we map basic info for now
        logradouro: s.Logradouro || s.logradouro,
        numero: s.Numero || s.numero,
        complemento: s.Complemento || s.complemento,
        bairro: s.Bairro || s.bairro,
        municipio: s.Cidade || s.cidade,
        uf: s.Estado || s.estado,
        cep: s.Cep || s.cep
    })) : [];

    return {
        company: {
            code: zenData.CompanyId || zenData.codigo || identifier,
            name: zenData.Nome || zenData.nome || zenData.razaoSocial || zenData.nomeFantasia,
            razao_social: zenData.Nome || zenData.razaoSocial || zenData.nome,
            cnpj: zenData.InscricaoFederal || zenData.cnpj || zenData.cpfCnpj,
            data_abertura: zenData.DataInicioRegime || zenData.dataAbertura,
            email: zenData.Email || zenData.email,
            telefone: zenData.Telefone || zenData.telefone,
            capital_social: parseQuestorNumber(zenData.CapitalSocial || zenData.capitalSocial || zenData.capital)
        },
        address: {
            tipo_logradouro: zenData.TipoLogradouro || zenData.tipoLogradouro || zenData.tipo,
            logradouro: zenData.Logradouro || zenData.logradouro || zenData.endereco,
            numero: zenData.Numero || zenData.numero,
            complemento: zenData.Complemento || zenData.complemento,
            bairro: zenData.Bairro || zenData.bairro,
            cidade: zenData.Cidade || zenData.cidade,
            uf: zenData.Estado || zenData.uf || zenData.estado,
            cep: zenData.Cep || zenData.cep
        },
        socios,
        source: 'zen'
    };
}


