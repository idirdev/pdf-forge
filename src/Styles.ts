import { Style, FontSpec, Color } from './types.js';

export const defaultStyles: Record<string, Style> = {
  body: {
    name: 'body',
    font: { family: 'Helvetica', size: 12, weight: 'normal', style: 'normal', color: { r: 0, g: 0, b: 0 } },
    align: 'left',
    lineHeight: 1.4,
    spaceBefore: 0,
    spaceAfter: 6,
  },
  h1: {
    name: 'h1',
    font: { family: 'Helvetica', size: 24, weight: 'bold' },
    spaceBefore: 0,
    spaceAfter: 12,
    parent: 'body',
  },
  h2: {
    name: 'h2',
    font: { family: 'Helvetica', size: 20, weight: 'bold' },
    spaceBefore: 12,
    spaceAfter: 8,
    parent: 'body',
  },
  h3: {
    name: 'h3',
    font: { family: 'Helvetica', size: 16, weight: 'bold' },
    spaceBefore: 10,
    spaceAfter: 6,
    parent: 'body',
  },
  caption: {
    name: 'caption',
    font: { family: 'Helvetica', size: 9, style: 'italic', color: { r: 100, g: 100, b: 100 } },
    align: 'center',
    parent: 'body',
  },
  code: {
    name: 'code',
    font: { family: 'Courier', size: 10 },
    lineHeight: 1.3,
    backgroundColor: { r: 245, g: 245, b: 245 },
    padding: 8,
    parent: 'body',
  },
};

export class StyleSystem {
  private registry: Map<string, Style> = new Map();

  constructor() {
    for (const [name, style] of Object.entries(defaultStyles)) {
      this.registry.set(name, style);
    }
  }

  register(name: string, style: Style): void {
    this.registry.set(name, { ...style, name });
  }

  get(name: string): Style | undefined {
    return this.registry.get(name);
  }

  /**
   * Resolve a style by cascading up through its parent chain.
   * Properties from the child override the parent.
   */
  resolve(style: Style): Style {
    if (!style.parent) return style;

    const parent = this.registry.get(style.parent);
    if (!parent) return style;

    const resolvedParent = this.resolve(parent);
    return this.merge(resolvedParent, style);
  }

  /**
   * Merge two styles. Properties in `override` take precedence.
   * Font properties are deep-merged.
   */
  merge(base: Style, override: Style): Style {
    return {
      name: override.name ?? base.name,
      font: this.mergeFont(base.font, override.font),
      align: override.align ?? base.align,
      indent: override.indent ?? base.indent,
      lineHeight: override.lineHeight ?? base.lineHeight,
      spaceBefore: override.spaceBefore ?? base.spaceBefore,
      spaceAfter: override.spaceAfter ?? base.spaceAfter,
      backgroundColor: override.backgroundColor ?? base.backgroundColor,
      borderColor: override.borderColor ?? base.borderColor,
      borderWidth: override.borderWidth ?? base.borderWidth,
      padding: override.padding ?? base.padding,
      parent: undefined, // Already resolved
    };
  }

  private mergeFont(base?: Partial<FontSpec>, override?: Partial<FontSpec>): Partial<FontSpec> {
    if (!base) return override ?? {};
    if (!override) return base;
    return {
      family: override.family ?? base.family,
      size: override.size ?? base.size,
      weight: override.weight ?? base.weight,
      style: override.style ?? base.style,
      color: override.color ?? base.color,
    };
  }

  listStyles(): string[] {
    return Array.from(this.registry.keys());
  }
}
