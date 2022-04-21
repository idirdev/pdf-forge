import {
  PDFDocumentOptions,
  Page,
  PageSize,
  Margin,
  ContentBlock,
  TextBlock,
  ImageBlock,
  TableBlock,
  Style,
  HeaderFooter,
  PAGE_SIZES,
  TableColumn,
  TableRow,
} from './types.js';
import { StyleSystem, defaultStyles } from './Styles.js';
import { PDFGenerator } from './Generator.js';

export class PDFDocument {
  private pages: Page[] = [];
  private options: Required<PDFDocumentOptions>;
  private currentPage: Page | null = null;
  private styleSystem: StyleSystem;
  private tocEntries: Array<{ title: string; level: number; page: number }> = [];

  constructor(options: PDFDocumentOptions = {}) {
    this.options = {
      title: options.title ?? 'Untitled',
      author: options.author ?? '',
      subject: options.subject ?? '',
      pageSize: options.pageSize ?? PAGE_SIZES.A4,
      margins: options.margins ?? { top: 72, right: 72, bottom: 72, left: 72 },
      defaultStyle: options.defaultStyle ?? defaultStyles.body,
      header: options.header ?? { content: '', showPageNumber: false },
      footer: options.footer ?? { content: '', showPageNumber: false },
    };
    this.styleSystem = new StyleSystem();
  }

  addPage(size?: PageSize, margins?: Margin): this {
    const page: Page = {
      index: this.pages.length,
      size: size ?? this.options.pageSize,
      margins: margins ?? this.options.margins,
      blocks: [],
      header: this.options.header.content ? this.options.header : undefined,
      footer: this.options.footer.content ? this.options.footer : undefined,
    };
    this.pages.push(page);
    this.currentPage = page;
    return this;
  }

  addText(content: string, style?: Style): this {
    this.ensurePage();
    const block: TextBlock = {
      type: 'text',
      content,
      style: style ? this.styleSystem.resolve(style) : this.options.defaultStyle,
    };
    this.currentPage!.blocks.push(block);
    return this;
  }

  addHeading(content: string, level: 1 | 2 | 3 = 1): this {
    const sizes: Record<number, number> = { 1: 24, 2: 20, 3: 16 };
    const style: Style = {
      font: { size: sizes[level], weight: 'bold' },
      spaceBefore: level === 1 ? 0 : 12,
      spaceAfter: 8,
    };
    this.tocEntries.push({ title: content, level, page: this.pages.length - 1 });
    return this.addText(content, style);
  }

  addImage(data: Uint8Array, width: number, height: number, align?: 'left' | 'center' | 'right'): this {
    this.ensurePage();
    const block: ImageBlock = { type: 'image', data, width, height, align };
    this.currentPage!.blocks.push(block);
    return this;
  }

  addTable(columns: TableColumn[], rows: TableRow[], options?: Partial<TableBlock>): this {
    this.ensurePage();
    const block: TableBlock = {
      type: 'table',
      columns,
      rows,
      headerRow: options?.headerRow ?? true,
      repeatHeaderOnBreak: options?.repeatHeaderOnBreak ?? true,
      alternateRowColors: options?.alternateRowColors,
      borderColor: options?.borderColor ?? { r: 200, g: 200, b: 200 },
      borderWidth: options?.borderWidth ?? 0.5,
    };
    this.currentPage!.blocks.push(block);
    return this;
  }

  setHeader(header: HeaderFooter): this {
    this.options.header = header;
    if (this.currentPage) this.currentPage.header = header;
    return this;
  }

  setFooter(footer: HeaderFooter): this {
    this.options.footer = footer;
    if (this.currentPage) this.currentPage.footer = footer;
    return this;
  }

  setFont(family: string, size: number): this {
    this.options.defaultStyle = {
      ...this.options.defaultStyle,
      font: { ...this.options.defaultStyle.font, family, size },
    };
    return this;
  }

  setMargins(margins: Margin): this {
    this.options.margins = margins;
    return this;
  }

  addPageBreak(): this {
    this.addPage();
    return this;
  }

  addTableOfContents(): this {
    this.ensurePage();
    this.addHeading('Table of Contents', 1);
    for (const entry of this.tocEntries) {
      const indent = '  '.repeat(entry.level - 1);
      this.addText(`${indent}${entry.title} ............ ${entry.page + 1}`, {
        font: { size: 11 },
        spaceAfter: 4,
      });
    }
    return this;
  }

  getPages(): Page[] { return [...this.pages]; }
  getPageCount(): number { return this.pages.length; }
  getTitle(): string { return this.options.title; }
  getAuthor(): string { return this.options.author; }

  generate(): Uint8Array {
    const generator = new PDFGenerator();
    return generator.generate(this);
  }

  private ensurePage(): void {
    if (!this.currentPage) this.addPage();
  }
}
