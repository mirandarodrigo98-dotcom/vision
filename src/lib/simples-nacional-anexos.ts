export interface FaixaSimplesNacional {
  faixa: number;
  rbt12Min: number;
  rbt12Max: number;
  aliquota: number;
  deducao: number;
}

export interface AnexoSimplesNacional {
  id: string;
  nome: string;
  descricao: string;
  faixas: FaixaSimplesNacional[];
}

export const ANEXOS_SIMPLES_NACIONAL: AnexoSimplesNacional[] = [
  {
    id: 'I',
    nome: 'Anexo I',
    descricao: 'Partilha do Simples Nacional - Comércio',
    faixas: [
      { faixa: 1, rbt12Min: 0, rbt12Max: 180000.00, aliquota: 0.040, deducao: 0.00 },
      { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000.00, aliquota: 0.073, deducao: 5940.00 },
      { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000.00, aliquota: 0.095, deducao: 13860.00 },
      { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000.00, aliquota: 0.107, deducao: 22500.00 },
      { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000.00, aliquota: 0.143, deducao: 87300.00 },
      { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000.00, aliquota: 0.190, deducao: 378000.00 },
    ],
  },
  {
    id: 'II',
    nome: 'Anexo II',
    descricao: 'Partilha do Simples Nacional - Indústria',
    faixas: [
      { faixa: 1, rbt12Min: 0, rbt12Max: 180000.00, aliquota: 0.045, deducao: 0.00 },
      { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000.00, aliquota: 0.078, deducao: 5940.00 },
      { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000.00, aliquota: 0.100, deducao: 13860.00 },
      { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000.00, aliquota: 0.112, deducao: 22500.00 },
      { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000.00, aliquota: 0.147, deducao: 85500.00 },
      { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000.00, aliquota: 0.300, deducao: 720000.00 },
    ],
  },
  {
    id: 'III',
    nome: 'Anexo III',
    descricao: 'Partilha do Simples Nacional - Receitas de Locação de Bens Móveis e de Prestação de Serviços descritos no inciso III do § 1º do art. 25 da Resolução CGSN nº 140, de 2018, e não relacionados nos Anexos IV ou V',
    faixas: [
      { faixa: 1, rbt12Min: 0, rbt12Max: 180000.00, aliquota: 0.060, deducao: 0.00 },
      { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000.00, aliquota: 0.112, deducao: 9360.00 },
      { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000.00, aliquota: 0.135, deducao: 17640.00 },
      { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000.00, aliquota: 0.160, deducao: 35640.00 },
      { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000.00, aliquota: 0.210, deducao: 125640.00 },
      { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000.00, aliquota: 0.330, deducao: 648000.00 },
    ],
  },
  {
    id: 'IV',
    nome: 'Anexo IV',
    descricao: 'Partilha do Simples Nacional - Receitas decorrentes da prestação de serviços relacionados no inciso IV do § 1º do art. 25 da Resolução CGSN nº 140, de 2018',
    faixas: [
      { faixa: 1, rbt12Min: 0, rbt12Max: 180000.00, aliquota: 0.045, deducao: 0.00 },
      { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000.00, aliquota: 0.090, deducao: 8100.00 },
      { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000.00, aliquota: 0.102, deducao: 12420.00 },
      { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000.00, aliquota: 0.140, deducao: 39780.00 },
      { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000.00, aliquota: 0.220, deducao: 183780.00 },
      { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000.00, aliquota: 0.330, deducao: 828000.00 },
    ],
  },
  {
    id: 'V',
    nome: 'Anexo V',
    descricao: 'Partilha do Simples Nacional - Receitas decorrentes da prestação de serviços relacionados no inciso V do § 1º do art. 25 da Resolução CGSN nº 140, de 2018',
    faixas: [
      { faixa: 1, rbt12Min: 0, rbt12Max: 180000.00, aliquota: 0.155, deducao: 0.00 },
      { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000.00, aliquota: 0.180, deducao: 4500.00 },
      { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000.00, aliquota: 0.195, deducao: 9900.00 },
      { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000.00, aliquota: 0.205, deducao: 17100.00 },
      { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000.00, aliquota: 0.230, deducao: 62100.00 },
      { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000.00, aliquota: 0.305, deducao: 540000.00 },
    ],
  }
];

export function getFaixaPorRBT12(rbt12: number): number {
  if (rbt12 <= 180000) return 1;
  if (rbt12 <= 360000) return 2;
  if (rbt12 <= 720000) return 3;
  if (rbt12 <= 1800000) return 4;
  if (rbt12 <= 3600000) return 5;
  return 6;
}

export function calcularAliquotaEfetiva(rbt12: number, anexoId: string): number {
  if (rbt12 === 0) return 0;
  
  const anexo = ANEXOS_SIMPLES_NACIONAL.find(a => a.id === anexoId);
  if (!anexo) return 0;

  const faixaNum = getFaixaPorRBT12(rbt12);
  const faixa = anexo.faixas.find(f => f.faixa === faixaNum);
  
  if (!faixa) return 0;

  // Alíquota Efetiva = ((RBT12 * Alíquota Nominal) - Parcela a Deduzir) / RBT12
  const aliquotaEfetiva = ((rbt12 * faixa.aliquota) - faixa.deducao) / rbt12;
  
  return aliquotaEfetiva > 0 ? aliquotaEfetiva : 0;
}
