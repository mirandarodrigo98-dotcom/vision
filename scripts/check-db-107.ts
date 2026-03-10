
import db from '../src/lib/db';

async function checkCompany107() {
  try {
    console.log('Verificando empresa 107 no banco de dados...');
    
    const company = await db.prepare(`
      SELECT id, nome, razao_social, code, cnpj, capital_social_centavos, address_type, address_street, address_number 
      FROM client_companies 
      WHERE code = '107'
    `).get();

    if (!company) {
      console.log('Empresa 107 NÃO encontrada no banco de dados.');
    } else {
      console.log('--- DADOS DA EMPRESA 107 ---');
      console.log('ID:', company.id);
      console.log('Razão Social:', company.razao_social);
      console.log('Código:', company.code);
      console.log('Capital Social (Centavos):', company.capital_social_centavos);
      console.log('Tipo Logradouro:', company.address_type);
      console.log('Logradouro:', company.address_street);
      console.log('Número:', company.address_number);
      console.log('----------------------------');
      
      if (company.capital_social_centavos === null || company.capital_social_centavos === undefined) {
          console.log('ALERTA: Capital Social está NULL/UNDEFINED.');
      } else {
          console.log(`Capital Social formatado: R$ ${(Number(company.capital_social_centavos) / 100).toFixed(2)}`);
      }

      if (!company.address_type) {
          console.log('ALERTA: Tipo Logradouro está VAZIO/NULL.');
      }
    }

  } catch (error) {
    console.error('Erro ao consultar banco:', error);
  }
}

checkCompany107();
