# pdf-forge

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)]()

**PDF generation library** with a fluent API, layout engine, table support, and template system. Zero runtime dependencies -- generates valid PDF 1.4 files using pure TypeScript.

## Features

- **Fluent document builder** - Chain methods to build PDFs naturally
- **Layout engine** - Text wrapping, word break, alignment (left/center/right/justify), multi-column
- **Table renderer** - Auto/fixed/percent column widths, header repeat on page break, alternating colors, cell merge
- **Style system** - Named styles with cascading inheritance, deep font merging
- **PDF 1.4 generator** - Direct binary output, no external dependencies
- **Templates** - Ready-to-use invoice template included
- **Page management** - Headers, footers, page numbers, table of contents

## Quick Start

```bash
npm install pdf-forge
```

### Create a PDF

```typescript
import { PDFDocument, PAGE_SIZES } from 'pdf-forge';
import { writeFileSync } from 'fs';

const doc = new PDFDocument({
  title: 'My Report',
  author: 'Jane Doe',
  pageSize: PAGE_SIZES.A4,
  margins: { top: 72, right: 72, bottom: 72, left: 72 },
});

doc.addPage()
   .addHeading('Annual Report 2025', 1)
   .addText('This is the introduction paragraph with automatic word wrapping.')
   .addHeading('Financial Summary', 2)
   .addTable(
     [
       { width: '40%', header: 'Category', align: 'left' },
       { width: '30%', header: 'Q1', align: 'right' },
       { width: '30%', header: 'Q2', align: 'right' },
     ],
     [
       { cells: [{ content: 'Revenue' }, { content: '$1.2M' }, { content: '$1.5M' }] },
       { cells: [{ content: 'Expenses' }, { content: '$800K' }, { content: '$900K' }] },
     ],
   )
   .addPageBreak()
   .addHeading('Conclusion', 2)
   .addText('Thank you for reading.');

const pdf = doc.generate();
writeFileSync('report.pdf', pdf);
```

### Generate an Invoice

```typescript
import { generateInvoice } from 'pdf-forge/templates/invoice';
import { writeFileSync } from 'fs';

const pdf = generateInvoice({
  invoiceNumber: 'INV-2025-001',
  date: '2025-01-15',
  dueDate: '2025-02-15',
  company: {
    name: 'Acme Corp',
    address: '123 Business St, Suite 100, San Francisco, CA 94102',
    email: 'billing@acme.com',
  },
  client: {
    name: 'Jane Smith',
    address: '456 Client Ave, New York, NY 10001',
    email: 'jane@example.com',
  },
  items: [
    { description: 'Web Development - Homepage Redesign', quantity: 40, unitPrice: 150 },
    { description: 'UI/UX Design - Mobile App', quantity: 20, unitPrice: 175 },
    { description: 'SEO Audit & Optimization', quantity: 1, unitPrice: 2500 },
  ],
  taxRate: 8.5,
  currency: 'USD',
  paymentTerms: 'Net 30. Payment by bank transfer or credit card.',
  notes: 'Thank you for your business! Please reference the invoice number in your payment.',
});

writeFileSync('invoice.pdf', pdf);
```

## Styles

```typescript
import { StyleSystem } from 'pdf-forge';

const styles = new StyleSystem();

// Register a custom style inheriting from body
styles.register('highlight', {
  font: { size: 14, weight: 'bold', color: { r: 52, g: 152, b: 219 } },
  backgroundColor: { r: 235, g: 245, b: 255 },
  padding: 12,
  parent: 'body',
});

// Built-in styles: body, h1, h2, h3, caption, code
```

## API Reference

### `PDFDocument`
- `addPage(size?, margins?)` - Add a new page
- `addText(content, style?)` - Add a text block
- `addHeading(text, level)` - Add a heading (1-3)
- `addImage(data, width, height, align?)` - Add an image
- `addTable(columns, rows, options?)` - Add a table
- `addTableOfContents()` - Add a table of contents
- `setHeader(header)` / `setFooter(footer)` - Set header/footer
- `generate()` - Generate PDF binary

### `LayoutEngine`
- `layoutText(block, width, y)` - Layout text with wrapping
- `wordWrap(text, maxWidth, font)` - Word wrap text
- `shouldBreakPage(y, height, lines, pageHeight, margin)` - Page break check
- `getColumnLayout(width, count, gutter?)` - Multi-column widths

### `TableRenderer`
- `render(table, width, y, pageHeight?)` - Render table to positioned cells

### `StyleSystem`
- `register(name, style)` - Register a named style
- `resolve(style)` - Resolve style with parent cascade
- `merge(base, override)` - Merge two styles

### `PDFGenerator`
- `generate(doc)` - Generate PDF 1.4 binary from document

## Supported Features

| Feature | Status |
|---------|--------|
| Text with wrapping | Supported |
| Text alignment | Left, Center, Right, Justify |
| Headings (h1-h3) | Supported |
| Tables | Supported |
| Table column widths | Auto, Fixed, Percent |
| Header repeat on break | Supported |
| Alternating row colors | Supported |
| Cell merge (colSpan) | Supported |
| Named styles | Supported |
| Style inheritance | Supported |
| Page headers/footers | Supported |
| Page numbers | Supported |
| Table of contents | Supported |
| Multi-column layout | Supported |
| Orphan/widow control | Supported |
| Images (placeholder) | Partial |

## License

MIT
