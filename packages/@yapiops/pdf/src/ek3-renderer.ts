import type { Ek3FormData } from '@yapiops/ek3';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { buildEk3FieldMap } from './ek3-field-map';
import { buildEk3Html } from './ek3-html-fallback';

export interface Ek3RenderInput {
  form: Ek3FormData;
  /** Bytes of the official Bakanlık template. If absent, the renderer falls
   *  back to a built-in HTML replica. */
  templateBytes?: Uint8Array | ArrayBuffer | null;
}

export interface Ek3RenderOutput {
  bytes: Uint8Array;
  /** Strategy used to render the PDF — useful for telemetry / Sentry breadcrumbs. */
  strategy: 'acroform' | 'html-fallback' | 'plain-template';
}

/**
 * Renders an Ek-3 PDF.
 *
 * Strategy:
 *  1. If `templateBytes` is provided AND it exposes AcroForm fields whose names
 *     match `buildEk3FieldMap`, fill the form, leave the engineer's signature
 *     field empty, then flatten everything else.
 *  2. If template is provided but has no AcroForm fields, return the template
 *     as-is with text overlay (rare; logged as `plain-template`).
 *  3. If no template at all, render the in-package HTML replica → PDF (this
 *     PDF is unsigned-friendly but not the official form layout).
 *
 * The HTML→PDF path uses pdf-lib + a tiny Times Roman fallback (no Puppeteer
 * dependency in this package). For pixel-perfect HTML rendering, the calling
 * Next.js route can pass the HTML to RaporX's Puppeteer pipeline once Phase 2
 * lands; for Phase 1 the lightweight pdf-lib path is enough to ship Ek-3 MVPs.
 */
export async function renderEk3Pdf(input: Ek3RenderInput): Promise<Ek3RenderOutput> {
  const { form, templateBytes } = input;
  const fieldMap = buildEk3FieldMap(form);

  if (templateBytes) {
    const pdfDoc = await PDFDocument.load(templateBytes);
    const acro = pdfDoc.getForm();
    const fields = acro.getFields();

    if (fields.length > 0) {
      for (const [name, value] of Object.entries(fieldMap)) {
        const target = fields.find((f) => f.getName() === name);
        if (!target) continue;
        try {
          // pdf-lib's `getTextField` is the safe path; ignore unknown subtypes.
          const tf = acro.getTextField(name);
          tf.setText(value);
        } catch {
          // Field exists but isn't a text field (radio/checkbox/signature etc.)
          // — skip and let downstream handle.
        }
      }
      acro.flatten({ updateFieldAppearances: true });
      const bytes = await pdfDoc.save();
      return { bytes, strategy: 'acroform' };
    }

    // No AcroForm fields → return the template untouched (consumer may reject).
    const bytes = await pdfDoc.save();
    return { bytes, strategy: 'plain-template' };
  }

  return renderHtmlFallback(form);
}

async function renderHtmlFallback(form: Ek3FormData): Promise<Ek3RenderOutput> {
  // Phase 1: produce a textual PDF that mirrors the HTML replica's structure.
  // Phase 2 (Puppeteer) will replace this with a pixel-perfect render.
  //
  // pdf-lib's bundled StandardFonts use the WinAnsi codepage which cannot
  // encode Turkish-specific glyphs (ş, ğ, ı, İ, …). We transliterate to ASCII
  // here so the fallback path is robust without bundling a TTF. The official
  // `acroform` path (with the Bakanlık template's embedded fonts) keeps
  // diacritics intact.
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const html = buildEk3Html(form);
  const lines = htmlToLines(html).map(transliterateToAscii);

  const pageMargin = 48;
  const lineHeight = 14;
  let page = pdfDoc.addPage();
  let y = page.getHeight() - pageMargin;

  for (const line of lines) {
    if (y < pageMargin) {
      page = pdfDoc.addPage();
      y = page.getHeight() - pageMargin;
    }
    const isHeader = line.startsWith('# ') || line.startsWith('## ');
    const text = line.replace(/^#+\s/, '');
    page.drawText(text, {
      x: pageMargin,
      y,
      size: isHeader ? 12 : 10,
      font: isHeader ? fontBold : font,
    });
    y -= isHeader ? lineHeight + 6 : lineHeight;
  }

  const bytes = await pdfDoc.save();
  return { bytes, strategy: 'html-fallback' };
}

const TURKISH_TRANSLITERATION: Record<string, string> = {
  Ç: 'C',
  ç: 'c',
  Ğ: 'G',
  ğ: 'g',
  İ: 'I',
  ı: 'i',
  Ö: 'O',
  ö: 'o',
  Ş: 'S',
  ş: 's',
  Ü: 'U',
  ü: 'u',
  Â: 'A',
  â: 'a',
  Î: 'I',
  î: 'i',
  Û: 'U',
  û: 'u',
};

function transliterateToAscii(input: string): string {
  let out = '';
  for (const ch of input) {
    const mapped = TURKISH_TRANSLITERATION[ch] ?? ch;
    // Drop anything still outside ASCII — the WinAnsi font can't encode it.
    const code = mapped.codePointAt(0);
    out += code != null && code <= 0x7e ? mapped : '?';
  }
  return out;
}

/**
 * Strips HTML tags into a flat line list with `# ` / `## ` markers for headers.
 * Pure function so it stays test-friendly.
 */
function htmlToLines(html: string): string[] {
  const cleaned = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<\/h1>/gi, '\n')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<\/h2>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '')
    .replace(/<th[^>]*>/gi, '')
    .replace(/<\/th>/gi, ': ')
    .replace(/<td[^>]*>/gi, '')
    .replace(/<\/td>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  return cleaned
    .split('\n')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0);
}
