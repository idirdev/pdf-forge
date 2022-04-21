export interface PDFDocumentOptions {
  title?: string;
  author?: string;
  subject?: string;
  pageSize?: PageSize;
  margins?: Margin;
  defaultStyle?: Style;
  header?: HeaderFooter;
  footer?: HeaderFooter;
}

export interface PageSize {
  width: number;   // in points (1pt = 1/72 inch)
  height: number;
}

export const PAGE_SIZES: Record<string, PageSize> = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
};

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Color {
  r: number;  // 0-255
  g: number;
  b: number;
  a?: number; // 0-1
}

export interface FontSpec {
  family: string;
  size: number;
  weight?: 'normal' | 'bold';
  style?: 'normal' | 'italic';
  color?: Color;
}

export interface Style {
  name?: string;
  font?: Partial<FontSpec>;
  align?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;
  lineHeight?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  backgroundColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  padding?: number | Margin;
  parent?: string;
}

export interface TextBlock {
  type: 'text';
  content: string;
  style?: Style;
}

export interface ImageBlock {
  type: 'image';
  data: Uint8Array;
  width: number;
  height: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableBlock {
  type: 'table';
  columns: TableColumn[];
  rows: TableRow[];
  headerRow?: boolean;
  repeatHeaderOnBreak?: boolean;
  alternateRowColors?: [Color, Color];
  borderColor?: Color;
  borderWidth?: number;
}

export type ContentBlock = TextBlock | ImageBlock | TableBlock;

export interface TableColumn {
  width: number | 'auto' | `${number}%`;
  header?: string;
  align?: 'left' | 'center' | 'right';
  style?: Style;
}

export interface TableRow {
  cells: TableCell[];
  height?: number;
  style?: Style;
}

export interface TableCell {
  content: string;
  colSpan?: number;
  rowSpan?: number;
  style?: Style;
  align?: 'left' | 'center' | 'right';
}

export interface HeaderFooter {
  content: string;
  style?: Style;
  showPageNumber?: boolean;
  pageNumberFormat?: string; // e.g., "Page {page} of {total}"
}

export interface Page {
  index: number;
  size: PageSize;
  margins: Margin;
  blocks: ContentBlock[];
  header?: HeaderFooter;
  footer?: HeaderFooter;
}

export interface LayoutResult {
  lines: LayoutLine[];
  height: number;
  pageBreaks: number[];
}

export interface LayoutLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font: FontSpec;
}
