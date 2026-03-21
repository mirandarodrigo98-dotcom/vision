export interface FaixaIRMensal {
  baseMin: number;
  baseMax: number;
  aliquota: number;
  deducao: number;
}

export interface FaixaIRIsencaoMensal {
  rendaMin: number;
  rendaMax: number;
  reducaoFormula: string;
}

export interface ImpostoRenda2026 {
  mensalTabela: FaixaIRMensal[];
  mensalIsencao: FaixaIRIsencaoMensal[];
  anualTabela: FaixaIRMensal[];
  anualIsencao: FaixaIRIsencaoMensal[];
  irpfmAlíquotas: { [key: string]: number };
}

export const IR_2026: ImpostoRenda2026 = {
  mensalTabela: [
    { baseMin: 0, baseMax: 2428.80, aliquota: 0, deducao: 0 },
    { baseMin: 2428.81, baseMax: 2826.65, aliquota: 7.5, deducao: 182.16 },
    { baseMin: 2826.66, baseMax: 3751.05, aliquota: 15, deducao: 394.16 },
    { baseMin: 3751.06, baseMax: 4664.68, aliquota: 22.5, deducao: 675.49 },
    { baseMin: 4664.69, baseMax: Infinity, aliquota: 27.5, deducao: 908.73 }
  ],
  mensalIsencao: [
    { rendaMin: 0, rendaMax: 5000, reducaoFormula: "Até R$ 312,89, zerando o imposto" },
    { rendaMin: 5000.01, rendaMax: 7350, reducaoFormula: "R$ 978,62 – (0,133145 × renda mensal)" },
    { rendaMin: 7350.01, rendaMax: Infinity, reducaoFormula: "Sem redução" }
  ],
  anualTabela: [
    { baseMin: 0, baseMax: 28467.20, aliquota: 0, deducao: 0 },
    { baseMin: 28467.21, baseMax: 33919.80, aliquota: 7.5, deducao: 2135.04 },
    { baseMin: 33919.81, baseMax: 45012.60, aliquota: 15, deducao: 4679.03 },
    { baseMin: 45012.61, baseMax: 55976.16, aliquota: 22.5, deducao: 8054.97 },
    { baseMin: 55976.17, baseMax: Infinity, aliquota: 27.5, deducao: 10853.78 }
  ],
  anualIsencao: [
    { rendaMin: 0, rendaMax: 60000, reducaoFormula: "Até R$ 2.694,15, zerando o imposto" },
    { rendaMin: 60000.01, rendaMax: 88200, reducaoFormula: "R$ 8.429,73 – (0,095575 × renda anual)" },
    { rendaMin: 88200.01, rendaMax: Infinity, reducaoFormula: "Sem redução" }
  ],
  irpfmAlíquotas: {
    "acima600000": 10,
    "acima1200000": 10
  }
};

export function getAliquotaIRMensal(baseCalculo: number): { aliquota: number; deducao: number } {
  const faixa = IR_2026.mensalTabela.find(f => baseCalculo >= f.baseMin && baseCalculo <= f.baseMax) || IR_2026.mensalTabela[IR_2026.mensalTabela.length - 1];
  return { aliquota: faixa.aliquota, deducao: faixa.deducao };
}
