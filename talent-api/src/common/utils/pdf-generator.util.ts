/**
 * PDF Generator Utility
 *
 * Generates a PDF-compatible buffer from HTML content. This uses a pure-Node
 * approach that builds a minimal valid PDF document from structured HTML,
 * without requiring external binaries like Puppeteer or wkhtmltopdf.
 *
 * The generated PDF contains text content extracted from the HTML with basic
 * formatting preserved (headings, paragraphs, lists).
 */

interface PdfObject {
  id: number;
  offset: number;
  content: string;
}

export class PdfGenerator {
  private objects: PdfObject[] = [];
  private objectCount = 0;
  private pageContentIds: number[] = [];

  /**
   * Generate a PDF buffer from HTML string.
   */
  static async generateFromHtml(html: string): Promise<Buffer> {
    const generator = new PdfGenerator();
    return generator.htmlToPdf(html);
  }

  /**
   * Generate a PDF buffer from plain text lines.
   */
  static async generateFromText(
    lines: string[],
    title?: string,
  ): Promise<Buffer> {
    const generator = new PdfGenerator();
    return generator.textToPdf(lines, title);
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    const textLines = this.extractTextFromHtml(html);
    const title = this.extractTitle(html);
    return this.textToPdf(textLines, title);
  }

  private textToPdf(lines: string[], title?: string): Buffer {
    this.objects = [];
    this.objectCount = 0;
    this.pageContentIds = [];

    // Split lines into pages (approximately 50 lines per page at 12pt)
    const linesPerPage = 50;
    const pages: string[][] = [];

    if (title) {
      lines.unshift(title, '');
    }

    for (let i = 0; i < lines.length; i += linesPerPage) {
      pages.push(lines.slice(i, i + linesPerPage));
    }

    if (pages.length === 0) {
      pages.push(['(Empty document)']);
    }

    // Object 1: Catalog
    const catalogId = this.addObject('<< /Type /Catalog /Pages 2 0 R >>');

    // Object 2: Pages (placeholder - will be updated)
    const pagesId = this.addObject(''); // placeholder

    // Object 3: Font
    const fontId = this.addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    );

    // Object 4: Bold Font
    const boldFontId = this.addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    );

    // Create page objects and content streams
    const pageObjIds: number[] = [];

    for (const pageLines of pages) {
      // Create content stream
      const stream = this.buildPageStream(pageLines, fontId, boldFontId);
      const streamBytes = Buffer.from(stream, 'latin1');
      const contentId = this.addObject(
        `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`,
      );

      // Create page object
      const pageId = this.addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] ` +
          `/Contents ${contentId} 0 R ` +
          `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> >>`,
      );

      pageObjIds.push(pageId);
    }

    // Update Pages object
    const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    this.objects[pagesId - 1].content = `<< /Type /Pages /Kids [${kids}] /Count ${pageObjIds.length} >>`;

    // Build the PDF
    return this.buildPdf();
  }

  private buildPageStream(
    lines: string[],
    _fontId: number,
    _boldFontId: number,
  ): string {
    const parts: string[] = [];
    parts.push('BT');

    let yPos = 800;
    const leftMargin = 50;
    const lineHeight = 14;

    for (const line of lines) {
      if (yPos < 40) break; // Stop before going off page

      const isHeading = line.startsWith('# ') || line.startsWith('## ');
      const cleanLine = line.replace(/^#+\s*/, '');
      const escapedLine = this.escapePdfString(cleanLine);

      if (isHeading) {
        parts.push(`/F2 14 Tf`);
        parts.push(`${leftMargin} ${yPos} Td`);
        parts.push(`(${escapedLine}) Tj`);
        yPos -= lineHeight + 4;
      } else {
        parts.push(`/F1 10 Tf`);
        parts.push(`${leftMargin} ${yPos} Td`);
        parts.push(`(${escapedLine}) Tj`);
        yPos -= lineHeight;
      }

      // Reset position for next line (Td is relative, so we use absolute positioning)
      parts.push(`${-leftMargin} ${-yPos} Td`);
    }

    parts.push('ET');
    return parts.join('\n');
  }

  private addObject(content: string): number {
    this.objectCount++;
    this.objects.push({
      id: this.objectCount,
      offset: 0,
      content,
    });
    return this.objectCount;
  }

  private buildPdf(): Buffer {
    const parts: string[] = [];

    // Header
    parts.push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    // Objects
    for (const obj of this.objects) {
      obj.offset = Buffer.byteLength(parts.join(''), 'latin1');
      parts.push(`${obj.id} 0 obj\n${obj.content}\nendobj\n\n`);
    }

    // Cross-reference table
    const xrefOffset = Buffer.byteLength(parts.join(''), 'latin1');
    parts.push('xref\n');
    parts.push(`0 ${this.objectCount + 1}\n`);
    parts.push('0000000000 65535 f \n');

    for (const obj of this.objects) {
      parts.push(
        `${String(obj.offset).padStart(10, '0')} 00000 n \n`,
      );
    }

    // Trailer
    parts.push('trailer\n');
    parts.push(
      `<< /Size ${this.objectCount + 1} /Root 1 0 R >>\n`,
    );
    parts.push('startxref\n');
    parts.push(`${xrefOffset}\n`);
    parts.push('%%EOF\n');

    return Buffer.from(parts.join(''), 'latin1');
  }

  private escapePdfString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\x00-\x1F]/g, '');
  }

  private extractTextFromHtml(html: string): string[] {
    const lines: string[] = [];

    // Remove script and style tags
    let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Convert heading tags to markdown-like format
    clean = clean.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
    clean = clean.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
    clean = clean.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n## $1\n');

    // Convert paragraphs and divs to newlines
    clean = clean.replace(/<\/?(p|div|br|tr|li|dt|dd)[^>]*>/gi, '\n');

    // Convert list items
    clean = clean.replace(/<li[^>]*>/gi, '\n  - ');

    // Remove remaining HTML tags
    clean = clean.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    clean = clean
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&mdash;/g, ' -- ')
      .replace(/&ndash;/g, ' - ')
      .replace(/&nbsp;/g, ' ');

    // Split into lines and clean up
    const rawLines = clean.split('\n');
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (trimmed.length > 0) {
        // Word-wrap long lines at ~90 characters
        if (trimmed.length > 90) {
          const words = trimmed.split(/\s+/);
          let currentLine = '';
          for (const word of words) {
            if ((currentLine + ' ' + word).length > 90 && currentLine.length > 0) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = currentLine ? currentLine + ' ' + word : word;
            }
          }
          if (currentLine) lines.push(currentLine);
        } else {
          lines.push(trimmed);
        }
      }
    }

    return lines;
  }

  private extractTitle(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    return undefined;
  }
}

/**
 * Convenience function to generate a PDF buffer from HTML.
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  return PdfGenerator.generateFromHtml(html);
}

/**
 * Convenience function to generate a PDF buffer from text lines.
 */
export async function generatePdfFromText(
  lines: string[],
  title?: string,
): Promise<Buffer> {
  return PdfGenerator.generateFromText(lines, title);
}
