import { TableBlock, TableColumn, TableRow, TableCell, Color, Style, FontSpec, PageSize, Margin } from './types.js';
import { LayoutEngine } from './Layout.js';

export interface RenderedTable {
  rows: RenderedRow[];
  totalWidth: number;
  totalHeight: number;
  columnWidths: number[];
  pageBreaks: number[]; // Row indices where page breaks occur
}

export interface RenderedRow {
  cells: RenderedCell[];
  y: number;
  height: number;
  isHeader: boolean;
  backgroundColor?: Color;
}

export interface RenderedCell {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align: 'left' | 'center' | 'right';
  font: FontSpec;
  colSpan: number;
  padding: number;
}

export class TableRenderer {
  private layout: LayoutEngine;

  constructor() {
    this.layout = new LayoutEngine();
  }

  render(table: TableBlock, availableWidth: number, startY: number, pageHeight?: number): RenderedTable {
    const columnWidths = this.resolveColumnWidths(table.columns, availableWidth);
    const renderedRows: RenderedRow[] = [];
    const pageBreaks: number[] = [];
    let currentY = startY;
    const cellPadding = 6;
    const defaultFont: FontSpec = { family: 'Helvetica', size: 10, weight: 'normal', style: 'normal' };

    // Render header row
    if (table.headerRow && table.columns.some((c) => c.header)) {
      const headerCells: RenderedCell[] = [];
      let maxCellHeight = 0;
      let cellX = 0;

      for (let colIdx = 0; colIdx < table.columns.length; colIdx++) {
        const col = table.columns[colIdx];
        const cellWidth = columnWidths[colIdx];
        const headerFont: FontSpec = { ...defaultFont, weight: 'bold' };
        const textWidth = this.layout.measureText(col.header ?? '', headerFont);
        const cellHeight = headerFont.size * 1.4 + cellPadding * 2;
        maxCellHeight = Math.max(maxCellHeight, cellHeight);

        headerCells.push({
          text: col.header ?? '',
          x: cellX,
          y: currentY,
          width: cellWidth,
          height: cellHeight,
          align: col.align ?? 'left',
          font: headerFont,
          colSpan: 1,
          padding: cellPadding,
        });
        cellX += cellWidth;
      }

      // Normalize heights
      for (const cell of headerCells) cell.height = maxCellHeight;

      renderedRows.push({
        cells: headerCells,
        y: currentY,
        height: maxCellHeight,
        isHeader: true,
        backgroundColor: { r: 240, g: 240, b: 240 },
      });

      currentY += maxCellHeight;
    }

    // Render data rows
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      const renderedCells: RenderedCell[] = [];
      let maxCellHeight = 0;
      let cellX = 0;
      let cellColIdx = 0;

      for (let cellIdx = 0; cellIdx < row.cells.length; cellIdx++) {
        const cell = row.cells[cellIdx];
        const colSpan = cell.colSpan ?? 1;
        let cellWidth = 0;
        for (let s = 0; s < colSpan && cellColIdx + s < columnWidths.length; s++) {
          cellWidth += columnWidths[cellColIdx + s];
        }

        const cellFont = this.resolveCellFont(cell.style, row.style, defaultFont);
        const innerWidth = cellWidth - cellPadding * 2;
        const wrappedLines = this.layout.wordWrap(cell.content, innerWidth, cellFont);
        const cellHeight = wrappedLines.length * cellFont.size * 1.4 + cellPadding * 2;
        maxCellHeight = Math.max(maxCellHeight, row.height ?? cellHeight);

        renderedCells.push({
          text: cell.content,
          x: cellX,
          y: currentY,
          width: cellWidth,
          height: cellHeight,
          align: cell.align ?? table.columns[cellColIdx]?.align ?? 'left',
          font: cellFont,
          colSpan,
          padding: cellPadding,
        });

        cellX += cellWidth;
        cellColIdx += colSpan;
      }

      // Normalize row heights
      for (const cell of renderedCells) cell.height = maxCellHeight;

      // Check page break
      if (pageHeight && currentY + maxCellHeight > pageHeight) {
        pageBreaks.push(rowIdx + (table.headerRow ? 1 : 0));
        currentY = 0; // Reset to top of next page (caller handles margins)
      }

      // Alternating row colors
      let bgColor: Color | undefined;
      if (table.alternateRowColors) {
        bgColor = rowIdx % 2 === 0 ? table.alternateRowColors[0] : table.alternateRowColors[1];
      }

      renderedRows.push({
        cells: renderedCells,
        y: currentY,
        height: maxCellHeight,
        isHeader: false,
        backgroundColor: bgColor,
      });

      currentY += maxCellHeight;
    }

    return {
      rows: renderedRows,
      totalWidth: columnWidths.reduce((a, b) => a + b, 0),
      totalHeight: currentY - startY,
      columnWidths,
      pageBreaks,
    };
  }

  private resolveColumnWidths(columns: TableColumn[], availableWidth: number): number[] {
    const widths: number[] = [];
    let fixedTotal = 0;
    let autoCount = 0;
    let percentTotal = 0;

    for (const col of columns) {
      if (typeof col.width === 'number') {
        widths.push(col.width);
        fixedTotal += col.width;
      } else if (typeof col.width === 'string' && col.width.endsWith('%')) {
        const percent = parseFloat(col.width) / 100;
        const width = availableWidth * percent;
        widths.push(width);
        percentTotal += width;
      } else {
        widths.push(-1); // Placeholder for auto
        autoCount++;
      }
    }

    // Distribute remaining width to auto columns
    if (autoCount > 0) {
      const remaining = availableWidth - fixedTotal - percentTotal;
      const autoWidth = Math.max(remaining / autoCount, 40);
      for (let i = 0; i < widths.length; i++) {
        if (widths[i] === -1) widths[i] = autoWidth;
      }
    }

    return widths;
  }

  private resolveCellFont(cellStyle?: Style, rowStyle?: Style, defaultFont?: FontSpec): FontSpec {
    const base = defaultFont ?? { family: 'Helvetica', size: 10, weight: 'normal' as const, style: 'normal' as const };
    return {
      ...base,
      ...rowStyle?.font,
      ...cellStyle?.font,
    };
  }
}
