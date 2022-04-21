import { PDFDocument } from '../Document.js';
import { Color, TableColumn, TableRow } from '../types.js';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  company: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  client: {
    name: string;
    address: string;
    email: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  taxRate?: number;
  currency?: string;
  notes?: string;
  paymentTerms?: string;
}

export function generateInvoice(data: InvoiceData): Uint8Array {
  const currency = data.currency ?? 'USD';
  const taxRate = data.taxRate ?? 0;
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const doc = new PDFDocument({
    title: `Invoice ${data.invoiceNumber}`,
    author: data.company.name,
    margins: { top: 60, right: 60, bottom: 60, left: 60 },
  });

  doc.addPage();

  // Company header
  doc.addText(data.company.name, {
    font: { size: 22, weight: 'bold', color: { r: 44, g: 62, b: 80 } },
    spaceAfter: 4,
  });
  doc.addText(data.company.address, { font: { size: 10, color: { r: 100, g: 100, b: 100 } }, spaceAfter: 2 });
  doc.addText(data.company.email, { font: { size: 10, color: { r: 100, g: 100, b: 100 } }, spaceAfter: 16 });

  // Invoice title and meta
  doc.addText('INVOICE', {
    font: { size: 28, weight: 'bold', color: { r: 52, g: 152, b: 219 } },
    align: 'right',
    spaceAfter: 8,
  });
  doc.addText(`Invoice #: ${data.invoiceNumber}`, { font: { size: 10 }, align: 'right', spaceAfter: 2 });
  doc.addText(`Date: ${data.date}`, { font: { size: 10 }, align: 'right', spaceAfter: 2 });
  doc.addText(`Due Date: ${data.dueDate}`, { font: { size: 10 }, align: 'right', spaceAfter: 16 });

  // Bill To
  doc.addText('Bill To:', { font: { size: 10, weight: 'bold' }, spaceAfter: 4 });
  doc.addText(data.client.name, { font: { size: 11 }, spaceAfter: 2 });
  doc.addText(data.client.address, { font: { size: 10, color: { r: 80, g: 80, b: 80 } }, spaceAfter: 2 });
  doc.addText(data.client.email, { font: { size: 10, color: { r: 80, g: 80, b: 80 } }, spaceAfter: 20 });

  // Line items table
  const columns: TableColumn[] = [
    { width: '50%', header: 'Description', align: 'left' },
    { width: '15%', header: 'Quantity', align: 'center' },
    { width: '17%', header: 'Unit Price', align: 'right' },
    { width: '18%', header: 'Amount', align: 'right' },
  ];

  const rows: TableRow[] = data.items.map((item) => ({
    cells: [
      { content: item.description },
      { content: String(item.quantity), align: 'center' as const },
      { content: fmt(item.unitPrice), align: 'right' as const },
      { content: fmt(item.quantity * item.unitPrice), align: 'right' as const },
    ],
  }));

  // Totals rows
  rows.push({
    cells: [
      { content: '', colSpan: 2 },
      { content: 'Subtotal', align: 'right', style: { font: { weight: 'bold' } } },
      { content: fmt(subtotal), align: 'right' },
    ],
  });

  if (taxRate > 0) {
    rows.push({
      cells: [
        { content: '', colSpan: 2 },
        { content: `Tax (${taxRate}%)`, align: 'right' },
        { content: fmt(tax), align: 'right' },
      ],
    });
  }

  rows.push({
    cells: [
      { content: '', colSpan: 2 },
      { content: 'TOTAL', align: 'right', style: { font: { size: 13, weight: 'bold' } } },
      { content: fmt(total), align: 'right', style: { font: { size: 13, weight: 'bold' } } },
    ],
    style: { backgroundColor: { r: 235, g: 245, b: 255 } },
  });

  doc.addTable(columns, rows, {
    headerRow: true,
    alternateRowColors: [
      { r: 255, g: 255, b: 255 },
      { r: 249, g: 249, b: 249 },
    ],
    borderColor: { r: 220, g: 220, b: 220 },
    borderWidth: 0.5,
  });

  // Payment terms
  if (data.paymentTerms) {
    doc.addText('Payment Terms', { font: { size: 11, weight: 'bold' }, spaceBefore: 24, spaceAfter: 4 });
    doc.addText(data.paymentTerms, { font: { size: 10, color: { r: 80, g: 80, b: 80 } }, spaceAfter: 8 });
  }

  // Notes
  if (data.notes) {
    doc.addText('Notes', { font: { size: 11, weight: 'bold' }, spaceBefore: 12, spaceAfter: 4 });
    doc.addText(data.notes, { font: { size: 10, color: { r: 80, g: 80, b: 80 } } });
  }

  // Footer
  doc.setFooter({
    content: 'Thank you for your business!',
    showPageNumber: true,
    pageNumberFormat: 'Page {page} of {total}',
    style: { font: { size: 9 }, align: 'center' },
  });

  return doc.generate();
}
