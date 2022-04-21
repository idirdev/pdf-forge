import { PDFDocument } from './Document.js';
import { LayoutEngine } from './Layout.js';
import { TableRenderer } from './Table.js';
import { Page, ContentBlock, TextBlock, TableBlock, Color, FontSpec, HeaderFooter } from './types.js';

/**
 * Generates a valid PDF 1.4 binary from a PDFDocument.
 * Implements the core PDF structure: header, body (objects), xref table, trailer.
 */
export class PDFGenerator {
  private objects: string[] = [];
  private objectOffsets: number[] = [];
  private layout: LayoutEngine;
  private tableRenderer: TableRenderer;
  private currentObjectId: number = 0;

  constructor() {
    this.layout = new LayoutEngine();
    this.tableRenderer = new TableRenderer();
  }

  generate(doc: PDFDocument): Uint8Array {
    this.objects = [];
    this.objectOffsets = [];
    this.currentObjectId = 0;

    const pages = doc.getPages();
    if (pages.length === 0) return this.encode('%PDF-1.4\n%%EOF');

    // 1. Catalog (obj 1)
    const catalogId = this.allocObject();
    // 2. Pages tree (obj 2)
    const pagesId = this.allocObject();
    // 3. Font (obj 3)
    const fontId = this.allocObject();

    // Create page objects
    const pageIds: number[] = [];
    const pageStreamIds: number[] = [];
    for (const page of pages) {
      pageIds.push(this.allocObject());
      pageStreamIds.push(this.allocObject());
    }

    // Build objects
    this.setObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    const pageRefs = pageIds.map((id) => `${id} 0 R`).join(' ');
    this.setObject(pagesId, `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);

    this.setObject(fontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);

    // Build each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const stream = this.renderPageStream(page, doc.getPageCount(), fontId);
      const streamBytes = new TextEncoder().encode(stream);

      this.setObject(pageIds[i],
        `<< /Type /Page /Parent ${pagesId} 0 R ` +
        `/MediaBox [0 0 ${page.size.width} ${page.size.height}] ` +
        `/Contents ${pageStreamIds[i]} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> >>`);

      this.setObject(pageStreamIds[i],
        `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
    }

    // Assemble the PDF
    return this.assemble(catalogId);
  }

  private renderPageStream(page: Page, totalPages: number, fontId: number): string {
    const ops: string[] = [];
    const contentWidth = page.size.width - page.margins.left - page.margins.right;
    let currentY = page.size.height - page.margins.top;

    // Render header
    if (page.header?.content) {
      const headerText = this.formatHeaderFooter(page.header, page.index + 1, totalPages);
      ops.push(...this.renderText(headerText, page.margins.left, page.size.height - 36, 10, 'normal'));
      currentY -= 20;
    }

    // Render content blocks
    for (const block of page.blocks) {
      switch (block.type) {
        case 'text': {
          const result = this.layout.layoutText(block, contentWidth, 0);
          for (const line of result.lines) {
            const pdfY = currentY - line.y;
            if (pdfY < page.margins.bottom) break;
            ops.push(...this.renderText(line.text, page.margins.left + line.x, pdfY, line.font.size, line.font.weight ?? 'normal'));
          }
          currentY -= result.height;
          break;
        }
        case 'table': {
          const rendered = this.tableRenderer.render(block, contentWidth, 0);
          for (const row of rendered.rows) {
            if (row.backgroundColor) {
              const c = row.backgroundColor;
              ops.push(`${c.r / 255} ${c.g / 255} ${c.b / 255} rg`);
              ops.push(`${page.margins.left} ${currentY - row.height} ${contentWidth} ${row.height} re f`);
              ops.push('0 0 0 rg');
            }
            for (const cell of row.cells) {
              const pdfY = currentY - cell.padding;
              ops.push(...this.renderText(cell.text, page.margins.left + cell.x + cell.padding, pdfY - cell.font.size, cell.font.size, cell.font.weight ?? 'normal'));
            }
            // Draw cell borders
            if (block.borderWidth && block.borderColor) {
              const bc = block.borderColor;
              ops.push(`${bc.r / 255} ${bc.g / 255} ${bc.b / 255} RG`);
              ops.push(`${block.borderWidth} w`);
              for (const cell of row.cells) {
                ops.push(`${page.margins.left + cell.x} ${currentY - row.height} ${cell.width} ${row.height} re S`);
              }
            }
            currentY -= row.height;
          }
          break;
        }
        case 'image': {
          // Images require XObject streams - emit a placeholder rect
          const imgX = block.align === 'center' ? page.margins.left + (contentWidth - block.width) / 2
            : block.align === 'right' ? page.margins.left + contentWidth - block.width
            : page.margins.left;
          ops.push(`0.9 0.9 0.9 rg`);
          ops.push(`${imgX} ${currentY - block.height} ${block.width} ${block.height} re f`);
          ops.push(`0 0 0 rg`);
          currentY -= block.height + 8;
          break;
        }
      }
    }

    // Render footer
    if (page.footer?.content) {
      const footerText = this.formatHeaderFooter(page.footer, page.index + 1, totalPages);
      ops.push(...this.renderText(footerText, page.margins.left, page.margins.bottom - 20, 10, 'normal'));
    }

    return ops.join('\n');
  }

  private renderText(text: string, x: number, y: number, size: number, weight: string): string[] {
    const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    return [
      'BT',
      `/F1 ${size} Tf`,
      `${x.toFixed(2)} ${y.toFixed(2)} Td`,
      `(${escaped}) Tj`,
      'ET',
    ];
  }

  private formatHeaderFooter(hf: HeaderFooter, page: number, total: number): string {
    let text = hf.content;
    if (hf.showPageNumber) {
      const format = hf.pageNumberFormat ?? 'Page {page} of {total}';
      text += ' ' + format.replace('{page}', String(page)).replace('{total}', String(total));
    }
    return text;
  }

  private allocObject(): number {
    this.currentObjectId++;
    this.objects[this.currentObjectId] = '';
    return this.currentObjectId;
  }

  private setObject(id: number, content: string): void {
    this.objects[id] = content;
  }

  private assemble(catalogId: number): Uint8Array {
    const parts: string[] = [];
    parts.push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const offsets: number[] = [];
    let position = parts[0].length;

    for (let i = 1; i <= this.currentObjectId; i++) {
      offsets[i] = position;
      const objStr = `${i} 0 obj\n${this.objects[i]}\nendobj\n`;
      parts.push(objStr);
      position += objStr.length;
    }

    // Cross-reference table
    const xrefOffset = position;
    const xrefLines = [`xref\n0 ${this.currentObjectId + 1}\n`];
    xrefLines.push('0000000000 65535 f \n');
    for (let i = 1; i <= this.currentObjectId; i++) {
      xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }
    parts.push(xrefLines.join(''));

    // Trailer
    parts.push(`trailer\n<< /Size ${this.currentObjectId + 1} /Root ${catalogId} 0 R >>\n`);
    parts.push(`startxref\n${xrefOffset}\n%%EOF\n`);

    return this.encode(parts.join(''));
  }

  private encode(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }
}
