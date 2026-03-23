const companies = [
  {
    id: 'f734df50-5b3f-407e-aab7-0814a0b0db93',
    nome: '',
    razao_social: 'CF DOS SANTOS COSMETICOS LTDA',
    is_active: 1
  }
];

const companySearch = 'cf dos santos';

const filteredCompanies = companies.filter(c => 
    c.nome.toLowerCase().includes(companySearch.toLowerCase()) || 
    (c.razao_social && c.razao_social.toLowerCase().includes(companySearch.toLowerCase()))
);

console.log(filteredCompanies);