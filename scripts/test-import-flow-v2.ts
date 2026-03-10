
// Mock functions to replicate src/lib/utils.ts behavior
function parseQuestorNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  
  if (str.includes(',') && !str.includes('.')) {
      return parseFloat(str.replace(',', '.'));
  }
  
  if (str.includes('.') && !str.includes(',')) {
      return parseFloat(str);
  }

  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  if (lastComma > lastDot) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  } else {
      return parseFloat(str.replace(/,/g, ''));
  }
}

function extractQuestorField(obj: any, keys: string[]): any {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
    if (obj[key.toUpperCase()] !== undefined && obj[key.toUpperCase()] !== null && obj[key.toUpperCase()] !== '') {
      return obj[key.toUpperCase()];
    }
    if (obj[key.toLowerCase()] !== undefined && obj[key.toLowerCase()] !== null && obj[key.toLowerCase()] !== '') {
      return obj[key.toLowerCase()];
    }
  }
  return undefined;
}

// Mock Questor Data
const mockQuestorResponse = {
  company: {
    code: '107',
    name: 'EMPRESA TESTE 107',
    razao_social: 'RAZAO SOCIAL TESTE 107',
    cnpj: '12345678000199',
    data_abertura: '2020-01-01',
    email: 'teste@teste.com',
    telefone: '11999999999',
    capital_social: 30000
  },
  address: {
    tipo_logradouro: 'Rua',
    logradouro: 'TESTE',
    numero: '123',
    complemento: '',
    bairro: 'CENTRO',
    cidade: 'SAO PAULO',
    uf: 'SP',
    cep: '01001000'
  },
  socios: [],
  source: 'syn' as const,
  raw: {}
};

console.log('--- TEST START ---');

// Simulate adaptToFormFormat logic
const adaptToFormFormat = (data: any) => {
    const adapted = {
        company: {
            NOME: data.company.razao_social,
            RAZAOSOCIAL: data.company.razao_social,
            NOMEFANTASIA: data.company.name,
            INSCRFEDERAL: data.company.cnpj,
            CODIGOEMPRESA: data.company.code,
            FANTASIA: data.company.name,
            CAPITALSOCIAL: data.company.capital_social, // Legacy key
            
            // Direct properties (New format)
            capital_social: data.company.capital_social,
            email: data.company.email,
            telefone: data.company.telefone,
            razao_social: data.company.razao_social,
            nome: data.company.name,
            cnpj: data.company.cnpj,
            code: data.company.code,
            data_abertura: data.company.data_abertura
        },
        estab: {
            DATAINICIOATIV: data.company.data_abertura,
            TIPOLOGRADOURO: data.address.tipo_logradouro, // Legacy key
            LOGRADOURO: data.address.logradouro,
            NUMERO: data.address.numero,
            COMPLEMENTO: data.address.complemento,
            BAIRRO: data.address.bairro,
            CEP: data.address.cep,
            NOMEMUNIC: data.address.cidade,
            SIGLAESTADO: data.address.uf,
            TELEFONE: data.company.telefone,
            EMAIL: data.company.email,
            CODIGOESTAB: '1',

            // Ensure these are also present in estab for legacy fallback
            capital_social: data.company.capital_social,
            CAPITALSOCIAL: data.company.capital_social
        },
        address: {
            ...data.address,
            tipo_logradouro: data.address.tipo_logradouro,
            logradouro: data.address.logradouro,
            numero: data.address.numero,
            complemento: data.address.complemento,
            bairro: data.address.bairro,
            cep: data.address.cep,
            cidade: data.address.cidade,
            uf: data.address.uf,
            municipio: data.address.cidade
        },
        socios: []
    };
    return adapted;
};

// Simulate onImport logic
const onImport = (data: any) => {
    console.log('--- ON IMPORT DEBUG ---');
    
    const c = data.company || {};
    const e = data.estab || {}; 
    const a = data.address || {}; 

    const find = (keys: string[]) => {
        const val = extractQuestorField(e, keys) || extractQuestorField(c, keys) || extractQuestorField(a, keys);
        return val || '';
    };
    
    // Capital Social
    const cap = extractQuestorField(c, ['CAPITALSOCIAL', 'capital_social', 'VALOR_CAPITAL', 'VL_CAPITAL_SOCIAL', 'capital']) || 
                extractQuestorField(e, ['CAPITALSOCIAL', 'capital_social', 'VALOR_CAPITAL', 'VL_CAPITAL_SOCIAL']);
                
    console.log('Capital Raw:', cap);
    
    const capCentavos = cap ? Math.round(parseQuestorNumber(cap) * 100) : 0;
    console.log('Capital Centavos:', capCentavos);

    // Address Type
    const addressType = extractQuestorField(a, ['tipo_logradouro', 'TIPOLOGRADOURO', 'TIPO', 'DS_TIPO_LOGRADOURO']) || 
                        find(['TIPOLOGRADOURO', 'DESCRTIPOLOGRAD', 'DS_TIPO_LOGRADOURO', 'tipo_logradouro', 'TIPO_LOGRADOURO', 'DS_LOGRADOURO_TIPO', 'TIPO']);
    console.log('Address Type Raw:', addressType);
    
    return {
        capital_social_centavos: capCentavos,
        address_type: addressType
    };
};

const adapted = adaptToFormFormat(mockQuestorResponse);
const result = onImport(adapted);
console.log('Final Result:', result);

if (result.capital_social_centavos === 3000000 && result.address_type === 'Rua') {
    console.log('SUCCESS: Logic is correct.');
} else {
    console.log('FAILURE: Logic is incorrect.');
    if (result.capital_social_centavos !== 3000000) console.log('Expected 3000000, got', result.capital_social_centavos);
    if (result.address_type !== 'Rua') console.log('Expected "Rua", got', result.address_type);
}
console.log('--- TEST END ---');
