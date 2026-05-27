// Cálculo de impostos — Lucro Presumido (serviços, base 32%)
// Compatível com a planilha "Grupo Luminart – Contábil".

export type Aliquota = { imposto: string; aliquota: number };

export type ApuracaoResultado = {
  faturamento: number;
  basePresumida: number;
  itens: Array<{
    imposto: string;
    base: number;
    aliquota: number;
    valor: number;
    adicional: number;
    total: number;
  }>;
  totalImpostos: number;
};

const BASE_PRESUMIDA_SERVICOS = 0.32; // 32%
const LIMITE_IRPJ_ADICIONAL_MENSAL = 20000; // R$ 20.000/mês de lucro presumido
const ALIQUOTA_IRPJ_ADICIONAL = 0.10; // 10%

/**
 * Calcula PIS, COFINS, IRPJ (com adicional) e CSLL no Lucro Presumido
 * para empresas de serviços (base 32%).
 *
 * @param faturamento Soma dos valores recebidos no período (mês).
 * @param aliquotas Lista de alíquotas por imposto (em %, ex.: PIS=0.65, IRPJ=15).
 */
export function calcularImpostosPresumido(
  faturamento: number,
  aliquotas: Aliquota[],
): ApuracaoResultado {
  const fat = Math.max(0, Number(faturamento) || 0);
  const basePresumida = +(fat * BASE_PRESUMIDA_SERVICOS).toFixed(2);
  const get = (nome: string) => {
    const a = aliquotas.find((x) => x.imposto.toUpperCase() === nome);
    return a ? Number(a.aliquota) / 100 : 0;
  };

  const itens: ApuracaoResultado["itens"] = [];

  // PIS / COFINS sobre faturamento bruto
  for (const imp of ["PIS", "COFINS"]) {
    const aliq = get(imp);
    const valor = +(fat * aliq).toFixed(2);
    itens.push({ imposto: imp, base: fat, aliquota: aliq * 100, valor, adicional: 0, total: valor });
  }

  // IRPJ sobre lucro presumido + adicional 10% sobre o que exceder R$ 20.000
  const aliqIRPJ = get("IRPJ");
  const valorIRPJ = +(basePresumida * aliqIRPJ).toFixed(2);
  const excedente = Math.max(0, basePresumida - LIMITE_IRPJ_ADICIONAL_MENSAL);
  const adicionalIRPJ = +(excedente * ALIQUOTA_IRPJ_ADICIONAL).toFixed(2);
  itens.push({
    imposto: "IRPJ",
    base: basePresumida,
    aliquota: aliqIRPJ * 100,
    valor: valorIRPJ,
    adicional: adicionalIRPJ,
    total: +(valorIRPJ + adicionalIRPJ).toFixed(2),
  });

  // CSLL sobre lucro presumido
  const aliqCSLL = get("CSLL");
  const valorCSLL = +(basePresumida * aliqCSLL).toFixed(2);
  itens.push({
    imposto: "CSLL",
    base: basePresumida,
    aliquota: aliqCSLL * 100,
    valor: valorCSLL,
    adicional: 0,
    total: valorCSLL,
  });

  const totalImpostos = +itens.reduce((s, i) => s + i.total, 0).toFixed(2);

  return { faturamento: fat, basePresumida, itens, totalImpostos };
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export function mesIndex(nome: string): number {
  return MESES.findIndex((m) => m.toLowerCase() === nome.toLowerCase());
}
