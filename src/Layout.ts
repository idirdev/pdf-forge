import { FontSpec, Style, PageSize, Margin, LayoutResult, LayoutLine, TextBlock } from './types.js';

export class LayoutEngine {
  private defaultFont: FontSpec = { family: 'Helvetica', size: 12, weight: 'normal', style: 'normal' };

  /**
   * Lay out a text block within the available width, performing word wrapping,
   * line height calculation, and alignment.
   */
  layoutText(block: TextBlock, availableWidth: number, startY: number): LayoutResult {
    const font = this.resolveFont(block.style?.font);
    const lineHeight = (block.style?.lineHeight ?? 1.4) * font.size;
    const align = block.style?.align ?? 'left';
    const indent = block.style?.indent ?? 0;
    const spaceBefore = block.style?.spaceBefore ?? 0;
    const spaceAfter = block.style?.spaceAfter ?? 0;

    const paragraphs = block.content.split('\n');
    const lines: LayoutLine[] = [];
    let y = startY + spaceBefore;

    for (const paragraph of paragraphs) {
      const wrappedLines = this.wordWrap(paragraph, availableWidth - indent, font);

      for (let i = 0; i < wrappedLines.length; i++) {
        const lineText = wrappedLines[i];
        const textWidth = this.measureText(lineText, font);
        const x = this.calculateX(align, indent, availableWidth, textWidth);

        lines.push({
          text: lineText,
          x,
          y,
          width: textWidth,
          height: lineHeight,
          font: { ...font },
        });

        y += lineHeight;
      }
    }

    return {
      lines,
      height: y - startY + spaceAfter,
      pageBreaks: [],
    };
  }

  /**
   * Wrap text into lines that fit within the given width.
   * Supports word-level wrapping and forced breaks for long words.
   */
  wordWrap(text: string, maxWidth: number, font: FontSpec): string[] {
    if (!text.trim()) return [''];

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const wordWidth = this.measureText(word, font);

      // If a single word exceeds the line, break it character by character
      if (wordWidth > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        const broken = this.breakWord(word, maxWidth, font);
        lines.push(...broken.slice(0, -1));
        currentLine = broken[broken.length - 1] ?? '';
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = this.measureText(testLine, font);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  }

  /**
   * Break a single word that is too long to fit on one line.
   */
  private breakWord(word: string, maxWidth: number, font: FontSpec): string[] {
    const parts: string[] = [];
    let current = '';

    for (const char of word) {
      const test = current + char;
      if (this.measureText(test, font) > maxWidth && current) {
        parts.push(current);
        current = char;
      } else {
        current = test;
      }
    }

    if (current) parts.push(current);
    return parts;
  }

  /**
   * Calculate horizontal position based on alignment.
   */
  private calculateX(align: string, indent: number, availableWidth: number, textWidth: number): number {
    switch (align) {
      case 'center': return indent + (availableWidth - indent - textWidth) / 2;
      case 'right': return availableWidth - textWidth;
      case 'justify': return indent; // Justification is handled at render time
      case 'left':
      default: return indent;
    }
  }

  /**
   * Approximate text width measurement using average character widths.
   * In a real implementation, this would use font metrics / glyph widths.
   */
  measureText(text: string, font: FontSpec): number {
    const avgCharWidth = font.size * 0.5;
    const boldMultiplier = font.weight === 'bold' ? 1.05 : 1;
    return text.length * avgCharWidth * boldMultiplier;
  }

  /**
   * Check if placing content at the current Y position would cause a page overflow.
   * Implements orphan/widow control: at least 2 lines should remain on the current
   * page and at least 2 lines should move to the next page.
   */
  shouldBreakPage(
    currentY: number,
    contentHeight: number,
    lineCount: number,
    pageHeight: number,
    marginBottom: number,
  ): { shouldBreak: boolean; breakAfterLine?: number } {
    const availableHeight = pageHeight - marginBottom;

    if (currentY + contentHeight <= availableHeight) {
      return { shouldBreak: false };
    }

    if (lineCount <= 1) {
      return { shouldBreak: true };
    }

    // Orphan/widow control: find where to break
    const lineHeight = contentHeight / lineCount;
    const fittingLines = Math.floor((availableHeight - currentY) / lineHeight);

    // At least 2 lines on current page and 2 on next page
    if (fittingLines < 2) {
      return { shouldBreak: true }; // Move entire block to next page
    }
    if (lineCount - fittingLines < 2) {
      return { shouldBreak: false, breakAfterLine: lineCount - 2 };
    }

    return { shouldBreak: false, breakAfterLine: fittingLines };
  }

  /**
   * Multi-column layout: split available width into equal columns with gutter.
   */
  getColumnLayout(availableWidth: number, columnCount: number, gutter: number = 20): Array<{ x: number; width: number }> {
    const totalGutter = gutter * (columnCount - 1);
    const columnWidth = (availableWidth - totalGutter) / columnCount;
    const columns: Array<{ x: number; width: number }> = [];

    for (let i = 0; i < columnCount; i++) {
      columns.push({
        x: i * (columnWidth + gutter),
        width: columnWidth,
      });
    }

    return columns;
  }

  private resolveFont(partial?: Partial<FontSpec>): FontSpec {
    return { ...this.defaultFont, ...partial };
  }
}
