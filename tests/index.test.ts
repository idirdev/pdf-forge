import { describe, it, expect } from 'vitest';
import { PDFDocument } from '../src/Document';
import { LayoutEngine } from '../src/Layout';
import { StyleSystem, defaultStyles } from '../src/Styles';
import { TableRenderer } from '../src/Table';
import { PAGE_SIZES } from '../src/types';

describe('PDFDocument', () => {
  it('should create a document with default options', () => {
    const doc = new PDFDocument();
    expect(doc.getTitle()).toBe('Untitled');
    expect(doc.getAuthor()).toBe('');
    expect(doc.getPageCount()).toBe(0);
  });

  it('should create a document with custom options', () => {
    const doc = new PDFDocument({
      title: 'Test PDF',
      author: 'Test Author',
      subject: 'Testing',
    });
    expect(doc.getTitle()).toBe('Test PDF');
    expect(doc.getAuthor()).toBe('Test Author');
  });

  it('should add pages and track page count', () => {
    const doc = new PDFDocument();
    doc.addPage();
    expect(doc.getPageCount()).toBe(1);
    doc.addPage();
    expect(doc.getPageCount()).toBe(2);
  });

  it('should support method chaining', () => {
    const doc = new PDFDocument({ title: 'Chained' });
    const result = doc.addPage().addText('Hello').addText('World');
    expect(result).toBe(doc);
    expect(doc.getPageCount()).toBe(1);
  });

  it('should auto-create a page when adding text without one', () => {
    const doc = new PDFDocument();
    doc.addText('Auto page creation');
    expect(doc.getPageCount()).toBe(1);
  });

  it('should add text blocks to the current page', () => {
    const doc = new PDFDocument();
    doc.addPage().addText('First paragraph').addText('Second paragraph');
    const pages = doc.getPages();
    expect(pages[0].blocks).toHaveLength(2);
    expect(pages[0].blocks[0].type).toBe('text');
    expect((pages[0].blocks[0] as any).content).toBe('First paragraph');
  });

  it('should add headings with correct font sizes', () => {
    const doc = new PDFDocument();
    doc.addPage().addHeading('Title', 1).addHeading('Subtitle', 2).addHeading('Section', 3);
    const pages = doc.getPages();
    expect(pages[0].blocks).toHaveLength(3);
    const h1 = pages[0].blocks[0] as any;
    const h2 = pages[0].blocks[1] as any;
    const h3 = pages[0].blocks[2] as any;
    expect(h1.style.font.size).toBe(24);
    expect(h2.style.font.size).toBe(20);
    expect(h3.style.font.size).toBe(16);
  });

  it('should add images to the page', () => {
    const doc = new PDFDocument();
    const imageData = new Uint8Array([1, 2, 3]);
    doc.addPage().addImage(imageData, 100, 50, 'center');
    const pages = doc.getPages();
    expect(pages[0].blocks[0].type).toBe('image');
    const imgBlock = pages[0].blocks[0] as any;
    expect(imgBlock.width).toBe(100);
    expect(imgBlock.height).toBe(50);
    expect(imgBlock.align).toBe('center');
  });

  it('should add tables with columns and rows', () => {
    const doc = new PDFDocument();
    const columns = [
      { width: 'auto' as const, header: 'Name' },
      { width: 'auto' as const, header: 'Age' },
    ];
    const rows = [
      { cells: [{ content: 'Alice' }, { content: '30' }] },
      { cells: [{ content: 'Bob' }, { content: '25' }] },
    ];
    doc.addPage().addTable(columns, rows);
    const pages = doc.getPages();
    expect(pages[0].blocks[0].type).toBe('table');
    const table = pages[0].blocks[0] as any;
    expect(table.columns).toHaveLength(2);
    expect(table.rows).toHaveLength(2);
    expect(table.headerRow).toBe(true);
  });

  it('should set header and footer', () => {
    const doc = new PDFDocument();
    doc.setHeader({ content: 'Header Text', showPageNumber: true });
    doc.setFooter({ content: 'Footer Text', showPageNumber: false });
    doc.addPage();
    const pages = doc.getPages();
    expect(pages[0].header?.content).toBe('Header Text');
    expect(pages[0].footer?.content).toBe('Footer Text');
  });

  it('should create a page break', () => {
    const doc = new PDFDocument();
    doc.addPage().addText('Page 1').addPageBreak().addText('Page 2');
    expect(doc.getPageCount()).toBe(2);
  });

  it('should set custom margins', () => {
    const doc = new PDFDocument();
    doc.setMargins({ top: 50, right: 50, bottom: 50, left: 50 });
    doc.addPage();
    const pages = doc.getPages();
    expect(pages[0].margins).toEqual({ top: 50, right: 50, bottom: 50, left: 50 });
  });

  it('should add a page with custom size', () => {
    const doc = new PDFDocument();
    doc.addPage(PAGE_SIZES.LETTER);
    const pages = doc.getPages();
    expect(pages[0].size).toEqual({ width: 612, height: 792 });
  });
});

describe('LayoutEngine', () => {
  const engine = new LayoutEngine();
  const defaultFont = { family: 'Helvetica', size: 12, weight: 'normal' as const, style: 'normal' as const };

  it('should measure text width based on font size', () => {
    const width = engine.measureText('Hello', defaultFont);
    // avgCharWidth = 12 * 0.5 = 6; 5 chars * 6 = 30
    expect(width).toBe(30);
  });

  it('should measure bold text as slightly wider', () => {
    const boldFont = { ...defaultFont, weight: 'bold' as const };
    const normalWidth = engine.measureText('Hello', defaultFont);
    const boldWidth = engine.measureText('Hello', boldFont);
    expect(boldWidth).toBeGreaterThan(normalWidth);
  });

  it('should word-wrap text that exceeds the available width', () => {
    const lines = engine.wordWrap('This is a longer sentence that should be wrapped', 80, defaultFont);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should return a single line for short text', () => {
    const lines = engine.wordWrap('Hi', 500, defaultFont);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Hi');
  });

  it('should handle empty text', () => {
    const lines = engine.wordWrap('', 100, defaultFont);
    expect(lines).toEqual(['']);
  });

  it('should layout text and produce lines with positions', () => {
    const block = { type: 'text' as const, content: 'Hello World', style: { font: defaultFont } };
    const result = engine.layoutText(block, 500, 0);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines[0].text).toBe('Hello World');
    expect(result.height).toBeGreaterThan(0);
  });

  it('should handle multi-line text with newlines', () => {
    const block = { type: 'text' as const, content: 'Line 1\nLine 2\nLine 3' };
    const result = engine.layoutText(block, 500, 0);
    expect(result.lines.length).toBe(3);
  });

  it('should not break page when content fits', () => {
    const result = engine.shouldBreakPage(0, 100, 5, 800, 72);
    expect(result.shouldBreak).toBe(false);
  });

  it('should break page when content exceeds available height', () => {
    const result = engine.shouldBreakPage(700, 200, 1, 800, 72);
    expect(result.shouldBreak).toBe(true);
  });

  it('should calculate column layout with gutters', () => {
    const columns = engine.getColumnLayout(600, 3, 20);
    expect(columns).toHaveLength(3);
    // totalGutter = 20 * 2 = 40; columnWidth = (600 - 40) / 3 = 186.67
    expect(columns[0].x).toBe(0);
    expect(columns[1].x).toBeCloseTo(columns[0].width + 20, 1);
    expect(columns[0].width).toBeCloseTo(186.67, 0);
  });
});

describe('StyleSystem', () => {
  it('should initialize with default styles', () => {
    const system = new StyleSystem();
    const names = system.listStyles();
    expect(names).toContain('body');
    expect(names).toContain('h1');
    expect(names).toContain('h2');
    expect(names).toContain('h3');
    expect(names).toContain('caption');
    expect(names).toContain('code');
  });

  it('should retrieve a registered style by name', () => {
    const system = new StyleSystem();
    const body = system.get('body');
    expect(body).toBeDefined();
    expect(body!.font?.family).toBe('Helvetica');
    expect(body!.font?.size).toBe(12);
  });

  it('should register a custom style', () => {
    const system = new StyleSystem();
    system.register('custom', { font: { size: 14, weight: 'bold' }, align: 'center' });
    const custom = system.get('custom');
    expect(custom).toBeDefined();
    expect(custom!.name).toBe('custom');
    expect(custom!.font?.size).toBe(14);
  });

  it('should resolve style with parent inheritance', () => {
    const system = new StyleSystem();
    const h2 = system.get('h2');
    expect(h2).toBeDefined();
    const resolved = system.resolve(h2!);
    // h2 has parent: 'body', so should inherit body properties
    expect(resolved.font?.family).toBe('Helvetica');
    expect(resolved.font?.size).toBe(20);
    expect(resolved.font?.weight).toBe('bold');
  });

  it('should merge two styles with override taking precedence', () => {
    const system = new StyleSystem();
    const merged = system.merge(
      { font: { family: 'Helvetica', size: 12 }, align: 'left' },
      { font: { size: 16 }, align: 'center' }
    );
    expect(merged.font?.family).toBe('Helvetica');
    expect(merged.font?.size).toBe(16);
    expect(merged.align).toBe('center');
  });
});

describe('TableRenderer', () => {
  it('should render a simple table with header', () => {
    const renderer = new TableRenderer();
    const table = {
      type: 'table' as const,
      columns: [
        { width: 'auto' as const, header: 'Name', align: 'left' as const },
        { width: 'auto' as const, header: 'Value', align: 'right' as const },
      ],
      rows: [
        { cells: [{ content: 'Item 1' }, { content: '100' }] },
        { cells: [{ content: 'Item 2' }, { content: '200' }] },
      ],
      headerRow: true,
    };
    const result = renderer.render(table, 500, 0);
    // header row + 2 data rows = 3 rendered rows
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].isHeader).toBe(true);
    expect(result.rows[1].isHeader).toBe(false);
    expect(result.totalWidth).toBeGreaterThan(0);
    expect(result.totalHeight).toBeGreaterThan(0);
    expect(result.columnWidths).toHaveLength(2);
  });

  it('should resolve fixed column widths', () => {
    const renderer = new TableRenderer();
    const table = {
      type: 'table' as const,
      columns: [
        { width: 100, header: 'Col1' },
        { width: 200, header: 'Col2' },
      ],
      rows: [{ cells: [{ content: 'A' }, { content: 'B' }] }],
      headerRow: true,
    };
    const result = renderer.render(table, 500, 0);
    expect(result.columnWidths[0]).toBe(100);
    expect(result.columnWidths[1]).toBe(200);
  });

  it('should resolve percentage column widths', () => {
    const renderer = new TableRenderer();
    const table = {
      type: 'table' as const,
      columns: [
        { width: '50%' as const, header: 'Col1' },
        { width: '50%' as const, header: 'Col2' },
      ],
      rows: [{ cells: [{ content: 'A' }, { content: 'B' }] }],
      headerRow: true,
    };
    const result = renderer.render(table, 400, 0);
    expect(result.columnWidths[0]).toBe(200);
    expect(result.columnWidths[1]).toBe(200);
  });

  it('should distribute auto widths evenly', () => {
    const renderer = new TableRenderer();
    const table = {
      type: 'table' as const,
      columns: [
        { width: 'auto' as const, header: 'Col1' },
        { width: 'auto' as const, header: 'Col2' },
      ],
      rows: [{ cells: [{ content: 'A' }, { content: 'B' }] }],
      headerRow: false,
    };
    const result = renderer.render(table, 400, 0);
    expect(result.columnWidths[0]).toBe(result.columnWidths[1]);
    expect(result.columnWidths[0]).toBeCloseTo(200, 0);
  });
});

describe('PAGE_SIZES', () => {
  it('should define standard page sizes', () => {
    expect(PAGE_SIZES.A4).toEqual({ width: 595.28, height: 841.89 });
    expect(PAGE_SIZES.LETTER).toEqual({ width: 612, height: 792 });
    expect(PAGE_SIZES.LEGAL).toEqual({ width: 612, height: 1008 });
    expect(PAGE_SIZES.A3).toEqual({ width: 841.89, height: 1190.55 });
  });
});
