import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Proposta } from "./types";
import { ambienteSubtotal, propostaSubtotalAmbientes, propostaCustos, propostaTotal } from "./types";

const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) => {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
};
const fmtPeriodo = (ini: string, fim: string) => {
  if (!ini && !fim) return "—";
  if (!fim || ini === fim) return fmtDate(ini);
  return `${fmtDate(ini)} – ${fmtDate(fim)}`;
};

export function gerarPropostaPDF(p: Proposta) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(20, 20, 30);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Logo da Empresa", 14, 12);
  doc.setFontSize(10);
  doc.text(`Proposta Nº ${p.numero}`, W - 14, 12, { align: "right" });
  doc.setTextColor(220, 220, 220);
  doc.text(`Emitida em ${fmtDate(p.createdAt.slice(0, 10))}`, W - 14, 19, { align: "right" });

  y = 38;
  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text("Dados do Cliente", 14, y);
  doc.setFontSize(10);
  y += 6;
  doc.text(`Nome: ${p.cliente.nome}`, 14, y);
  y += 5;
  doc.text(`Telefone: ${p.cliente.telefone}`, 14, y);
  y += 5;
  doc.text(`Email: ${p.cliente.email}`, 14, y);

  y += 8;
  doc.setFontSize(13);
  doc.text("Dados do Evento", 14, y);
  doc.setFontSize(10);
  y += 6;
  doc.text(`Tipo: ${p.evento.tipo || "—"}`, 14, y);
  doc.text(`Período: ${fmtPeriodo(p.evento.dataInicio, p.evento.dataFim)}`, 90, y);
  y += 5;
  doc.text(`Local: ${p.evento.local || "—"}`, 14, y);
  doc.text(`Cidade: ${p.evento.cidade || "—"}`, 120, y);
  if (p.evento.observacoes) {
    y += 5;
    doc.text(`Obs.: ${p.evento.observacoes}`, 14, y);
  }

  y += 8;

  // Tabela hierárquica
  const rows: any[] = [];
  (p.ambientes || []).forEach((amb) => {
    rows.push([
      { content: amb.nome || "Ambiente", colSpan: 4, styles: { fontStyle: "bold", fillColor: [230, 230, 240] } },
      { content: brl(ambienteSubtotal(amb)), styles: { fontStyle: "bold", halign: "right", fillColor: [230, 230, 240] } },
    ]);
    amb.itens.forEach((it) => {
      rows.push([
        { content: `  ${it.nome || "Item"}`, colSpan: 5, styles: { fontStyle: "bold" } },
      ]);
      it.descricoes.forEach((d) => {
        rows.push([
          `    ${d.descricao || "—"}`,
          d.unidade,
          String(d.quantidade),
          brl(d.valorUnitario),
          brl(d.quantidade * d.valorUnitario),
        ]);
      });
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Unid.", "Qtd", "Valor unit.", "Subtotal"]],
    body: rows,
    headStyles: { fillColor: [40, 40, 60] },
    styles: { fontSize: 9 },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  const subtotalItens = propostaSubtotalAmbientes(p);
  const totalCustos = propostaCustos(p);
  const totalFinal = propostaTotal(p);

  doc.setFontSize(13);
  doc.text("Custos adicionais", 14, y);
  doc.setFontSize(10);
  y += 6;
  doc.text(`Frete: ${brl(p.custos.frete)}`, 14, y);
  doc.text(`Montagem: ${brl(p.custos.montagem)}`, 80, y);
  doc.text(`Desmontagem: ${brl(p.custos.desmontagem)}`, 150, y);
  (p.custos.outros || []).forEach((c) => {
    y += 5;
    doc.text(`${c.descricao}: ${brl(c.valor)}`, 14, y);
  });

  y += 10;
  doc.setDrawColor(180);
  doc.line(14, y, W - 14, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Subtotal ambientes: ${brl(subtotalItens)}`, W - 14, y, { align: "right" });
  y += 6;
  doc.text(`Total custos: ${brl(totalCustos)}`, W - 14, y, { align: "right" });
  y += 7;
  doc.setFontSize(13);
  doc.setFont(undefined as any, "bold");
  doc.text(`Total final: ${brl(totalFinal)}`, W - 14, y, { align: "right" });
  doc.setFont(undefined as any, "normal");
  y += 10;
  doc.setFontSize(10);
  doc.text(`Validade da proposta: ${fmtDate(p.resumo.validade)}`, 14, y);

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(180);
  doc.line(14, H - 18, W - 14, H - 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Contato: contato@empresa.com.br  |  (00) 0000-0000  |  www.empresa.com.br", W / 2, H - 10, {
    align: "center",
  });

  doc.save(`Proposta-${p.numero}.pdf`);
}
