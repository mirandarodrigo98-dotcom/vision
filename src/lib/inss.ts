export interface FaixaINSSProgressiva {
  faixa: number;
  baseMin: number;
  baseMax: number;
  aliquota: number;
}

export interface TabelaINSS {
  progressiva: FaixaINSSProgressiva[];
  contribuinteIndividual: {
    aliquotaPadrao: number;
    aliquotaSimplificada: number;
    aliquotaMEI: number;
    salarioMinimo: number;
    teto: number;
  };
}

export const INSS_2026: TabelaINSS = {
  progressiva: [
    { faixa: 1, baseMin: 0, baseMax: 1621.00, aliquota: 7.5 },
    { faixa: 2, baseMin: 1621.01, baseMax: 2902.84, aliquota: 9.0 },
    { faixa: 3, baseMin: 2902.85, baseMax: 4354.27, aliquota: 12.0 },
    { faixa: 4, baseMin: 4354.28, baseMax: 8475.55, aliquota: 14.0 },
  ],
  contribuinteIndividual: {
    aliquotaPadrao: 20.0,
    aliquotaSimplificada: 11.0,
    aliquotaMEI: 5.0,
    salarioMinimo: 1621.00,
    teto: 8475.55
  }
};

/**
 * Calcula o INSS Progressivo (para empregados)
 */
export function calcularINSSProgressivo(salarioBase: number): number {
  if (salarioBase <= 0) return 0;
  
  const base = Math.min(salarioBase, INSS_2026.contribuinteIndividual.teto);
  let inssTotal = 0;

  for (const faixa of INSS_2026.progressiva) {
    if (base > faixa.baseMin) {
      const valorBaseNaFaixa = Math.min(base, faixa.baseMax) - faixa.baseMin;
      // Para a primeira faixa, como o baseMin é 0, o cálculo direto dá certo.
      // O ajuste (baseMin vs faixa anterior max) é porque as tabelas oficiais dizem "de X.01 a Y",
      // na prática a base da faixa é a diferença entre os limites exatos.
      // Ajustando limites exatos:
      const limiteInferior = faixa.faixa === 1 ? 0 : INSS_2026.progressiva[faixa.faixa - 2].baseMax;
      const valorTributavel = Math.min(base, faixa.baseMax) - limiteInferior;
      
      inssTotal += (valorTributavel * faixa.aliquota) / 100;
    }
  }

  return inssTotal;
}

/**
 * Calcula o INSS do Pró-labore (Contribuinte Individual)
 * Por padrão, sócios recolhem 11% sobre o pró-labore, limitado ao teto.
 */
export function calcularINSSProLabore(valorProLabore: number): number {
  if (valorProLabore <= 0) return 0;
  
  const base = Math.min(valorProLabore, INSS_2026.contribuinteIndividual.teto);
  return (base * INSS_2026.contribuinteIndividual.aliquotaSimplificada) / 100;
}
