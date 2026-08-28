import type { Command, DogProfile, Entry, WeightEntry } from './types';
import { formatDateShort, formatKg } from './utils';

// ===== CSV =====

function escapeField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(row[h])).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  const csv = toCSV(rows);
  if (!csv) return;
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== PDF (jspdf wird erst beim ersten Export geladen) =====

type JsPDF = import('jspdf').jsPDF;
type AutoTable = (doc: JsPDF, opts: Record<string, unknown>) => void;

function pdfHeader(doc: JsPDF, dog: DogProfile) {
  doc.setFontSize(18);
  doc.setTextColor('#292524');
  doc.text(`Trainingstagebuch: ${dog.name}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor('#78716c');
  const meta = [dog.rasse, dog.geburtsdatum ? `geb. ${formatDateShort(dog.geburtsdatum)}` : null]
    .filter(Boolean)
    .join(' · ');
  doc.text(meta || 'Hundeapp Trainingstagebuch', 14, 25);
  doc.setDrawColor('#ea7c3a');
  doc.line(14, 29, 196, 29);
}

function pdfSection(doc: JsPDF, title: string, y: number) {
  doc.setFontSize(13);
  doc.setTextColor('#292524');
  doc.text(title, 14, y);
}

function pdfTable(
  autoTable: AutoTable,
  doc: JsPDF,
  y: number,
  head: string[],
  body: (string | number)[][]
): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: '#faf7f2', textColor: '#292524', fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });
  return (doc as JsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
}

export async function downloadPDF(
  dog: DogProfile,
  entries: Entry[],
  commands: Command[],
  weights: WeightEntry[]
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  pdfHeader(doc, dog);

  let y = 44;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length > 0) {
    pdfSection(doc, 'Trainingseinträge', y);
    y = pdfTable(
      autoTable,
      doc,
      y + 6,
      ['Datum', 'Ort', 'Kommandos', 'Was gemacht', 'Tipps'],
      sorted.map((e) => [
        formatDateShort(e.date),
        e.ort ?? '',
        e.commands.map((c) => c.name).join(', '),
        e.was_gemacht ?? '',
        e.tipps ?? ''
      ])
    );
    y += 6;
  }

  if (commands.length > 0) {
    pdfSection(doc, 'Kommandos', y);
    y = pdfTable(
      autoTable,
      doc,
      y + 6,
      ['Kommando', 'Beschreibung', 'Tipp'],
      commands.map((c) => [c.name, c.beschreibung ?? '', c.tipp ?? ''])
    );
    y += 6;
  }

  if (weights.length > 0) {
    pdfSection(doc, 'Gewicht', y);
    pdfTable(
      autoTable,
      doc,
      y + 6,
      ['Datum', 'Gewicht', 'Notiz'],
      [...weights]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((w) => [formatDateShort(w.date), formatKg(w.weightKg), w.note ?? ''])
    );
  }

  doc.save(`trainingstagebuch-${dog.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
