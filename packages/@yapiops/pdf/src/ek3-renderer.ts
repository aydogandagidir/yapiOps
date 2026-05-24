import fontkit from '@pdf-lib/fontkit';
import type { Ek3FormData } from '@yapiops/ek3';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { buildEk3FieldMap } from './ek3-field-map';
import { ROBOTO_BOLD_B64, ROBOTO_REGULAR_B64 } from './fonts/roboto';

export interface Ek3RenderInput {
  form: Ek3FormData;
  /** Bytes of the official Bakanlık template. If absent, the renderer falls
   *  back to a built-in form replica that preserves Turkish glyphs. */
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
 *     as-is (rare; logged as `plain-template`).
 *  3. If no template at all, render the in-package form replica. Unlike the old
 *     ASCII text dump, this path embeds a subset of Roboto (Unicode) so Turkish
 *     characters (ş, ğ, ı, İ, ç, ö, ü) survive and the output mirrors the
 *     official form's section structure.
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

  return renderReplica(form);
}

// ---------------------------------------------------------------------------
// Form replica (no official template available)
// ---------------------------------------------------------------------------

const PAGE = { width: 595.28, height: 841.89 } as const; // A4 portrait
const MARGIN = 50;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const LABEL_WIDTH = 170;
const COL_GAP = 12;
const VALUE_X = MARGIN + LABEL_WIDTH + COL_GAP;
const VALUE_WIDTH = CONTENT_WIDTH - LABEL_WIDTH - COL_GAP;
const BODY_SIZE = 9.5;
const LINE_HEIGHT = 13;
const BOTTOM_MARGIN = 56;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.8, 0.82, 0.85);

// Font bytes are decoded lazily and memoized on first render. Decoding at module
// load would hit a temporal-dead-zone on the base64 helper defined below.
let robotoRegularBytes: Uint8Array | undefined;
let robotoBoldBytes: Uint8Array | undefined;
const getRobotoRegular = (): Uint8Array =>
  (robotoRegularBytes ??= base64ToBytes(ROBOTO_REGULAR_B64));
const getRobotoBold = (): Uint8Array => (robotoBoldBytes ??= base64ToBytes(ROBOTO_BOLD_B64));

interface RenderCtx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
}

async function renderReplica(form: Ek3FormData): Promise<Ek3RenderOutput> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit as Parameters<typeof doc.registerFontkit>[0]);
  const font = await doc.embedFont(getRobotoRegular(), { subset: true });
  const bold = await doc.embedFont(getRobotoBold(), { subset: true });

  const map = buildEk3FieldMap(form);
  const g = (key: string): string => map[key] ?? '';
  const compact = (parts: string[], sep: string): string =>
    parts.filter((p) => p.length > 0).join(sep);

  const ctx: RenderCtx = {
    doc,
    page: doc.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - MARGIN,
    font,
    bold,
  };

  drawDocumentHeader(ctx);

  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: '1. Proje Bilgileri',
      rows: [
        ['Proje adı', g('proje_adi')],
        ['İl / İlçe / Mahalle', compact([g('il'), g('ilce'), g('mahalle')], ' / ')],
        ['Pafta / Ada / Parsel', compact([g('pafta'), g('ada'), g('parsel')], ' / ')],
        ['Koordinat (enlem, boylam)', g('koordinat')],
        ['İmar durumu', g('imar_durumu')],
      ],
    },
    {
      title: '2. Yapı Bilgileri',
      rows: [
        ['Yapı sınıfı', g('yapi_sinifi')],
        ['Kullanım amacı', g('kullanim_amaci')],
        ['Toplam inşaat alanı (m²)', g('toplam_alan')],
        ['Bodrum / Zemin üstü kat', compact([g('bodrum_kat'), g('zemin_ustu_kat')], ' / ')],
        ['Toplam yükseklik (m)', g('toplam_yukseklik')],
        ['Taşıyıcı sistem', g('tasiyici_sistem')],
        ['Deprem Tasarım Sınıfı (DTS) / BYS', compact([g('dts'), g('bys')], ' / ')],
        ['Sds / Sd1 / PGA', compact([g('sds'), g('sd1'), g('pga')], ' / ')],
      ],
    },
    {
      title: '3. İnşaat Bilgileri',
      rows: [
        ['Yapı ruhsat no / tarihi', compact([g('yapi_ruhsat_no'), g('yapi_ruhsat_tarihi')], ' / ')],
        ['Başlama – Bitiş', compact([g('insaat_baslama'), g('insaat_bitis')], ' – ')],
        ['Toplam süre (gün)', g('insaat_sure_gun')],
        ['İnşaat maliyeti (₺)', g('insaat_maliyet')],
      ],
    },
    {
      title: '4. Yapı Sahibi',
      rows: [
        ['Ad soyad / Ünvan', g('sahibi_ad_soyad')],
        ['TCKN / VKN', compact([g('sahibi_tckn'), g('sahibi_vkn')], ' · ')],
        ['Adres', g('sahibi_adres')],
        ['Telefon / E-posta', compact([g('sahibi_telefon'), g('sahibi_eposta')], ' · ')],
      ],
    },
    {
      title: '5. Yapı Müteahhidi',
      rows: [
        ['Ünvan / VKN', compact([g('muteahhit_unvan'), g('muteahhit_vkn')], ' · ')],
        [
          'Yetki belgesi (sınıf / no)',
          compact([g('muteahhit_yetki_belgesi_sinifi'), g('muteahhit_yetki_belgesi_no')], ' / '),
        ],
        [
          'Yetkilisi (TCKN)',
          compact([g('muteahhit_yetkili_adi'), g('muteahhit_yetkili_tckn')], ' · '),
        ],
        ['Adres', g('muteahhit_adres')],
        ['Telefon / E-posta', compact([g('muteahhit_telefon'), g('muteahhit_eposta')], ' · ')],
      ],
    },
    {
      title: '6. Yapı Denetim Kuruluşu',
      rows: [
        ['Ünvan / VKN', compact([g('denetim_unvan'), g('denetim_vkn')], ' · ')],
        ['İzin belgesi no', g('denetim_izin_belgesi_no')],
        [
          'Sorumlu mühendis (oda sicil)',
          compact([g('denetim_sorumlu_muhendis'), g('denetim_oda_sicil')], ' · '),
        ],
        ['Adres', g('denetim_adres')],
        ['Telefon / E-posta', compact([g('denetim_telefon'), g('denetim_eposta')], ' · ')],
      ],
    },
  ];

  for (const section of sections) {
    drawSectionHeader(ctx, section.title);
    for (const [label, value] of section.rows) drawRow(ctx, label, value);
  }

  drawSignatures(ctx);
  drawDisclaimer(ctx);
  stampFooters(doc, font);

  const bytes = await doc.save();
  return { bytes, strategy: 'html-fallback' };
}

function drawDocumentHeader(ctx: RenderCtx): void {
  const title = 'YAPI DENETİM HİZMET SÖZLEŞMESİ EK-3';
  const titleSize = 15;
  const titleWidth = ctx.bold.widthOfTextAtSize(title, titleSize);
  ctx.page.drawText(title, {
    x: (PAGE.width - titleWidth) / 2,
    y: ctx.y - titleSize,
    size: titleSize,
    font: ctx.bold,
    color: INK,
  });
  ctx.y -= titleSize + 8;

  const subtitle = 'Resmî Gazete: 30/05/2019 – 30789';
  const subWidth = ctx.font.widthOfTextAtSize(subtitle, 9);
  ctx.page.drawText(subtitle, {
    x: (PAGE.width - subWidth) / 2,
    y: ctx.y - 9,
    size: 9,
    font: ctx.font,
    color: MUTED,
  });
  ctx.y -= 9 + 10;
}

function drawSectionHeader(ctx: RenderCtx, title: string): void {
  ensureSpace(ctx, 30);
  ctx.y -= 8;
  ctx.page.drawText(title, { x: MARGIN, y: ctx.y - 11.5, size: 11.5, font: ctx.bold, color: INK });
  const ruleY = ctx.y - 11.5 - 5;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ruleY },
    end: { x: MARGIN + CONTENT_WIDTH, y: ruleY },
    thickness: 0.75,
    color: RULE,
  });
  ctx.y = ruleY - 12;
}

function drawRow(ctx: RenderCtx, label: string, value: string): void {
  const valueLines = wrapText(value.length > 0 ? value : '—', ctx.font, BODY_SIZE, VALUE_WIDTH);
  const labelLines = wrapText(label, ctx.bold, BODY_SIZE, LABEL_WIDTH);
  const rowCount = Math.max(valueLines.length, labelLines.length);
  ensureSpace(ctx, rowCount * LINE_HEIGHT + 4);

  const top = ctx.y;
  labelLines.forEach((line, i) => {
    ctx.page.drawText(line, {
      x: MARGIN,
      y: top - LINE_HEIGHT - i * LINE_HEIGHT + 2,
      size: BODY_SIZE,
      font: ctx.bold,
      color: MUTED,
    });
  });
  valueLines.forEach((line, i) => {
    ctx.page.drawText(line, {
      x: VALUE_X,
      y: top - LINE_HEIGHT - i * LINE_HEIGHT + 2,
      size: BODY_SIZE,
      font: ctx.font,
      color: INK,
    });
  });
  ctx.y = top - rowCount * LINE_HEIGHT - 4;
}

function drawSignatures(ctx: RenderCtx): void {
  ensureSpace(ctx, 96);
  ctx.y -= 42;
  const labels = ['Yapı Sahibi', 'Yapı Müteahhidi', 'Sorumlu Mühendis (e-imza)'];
  const colWidth = CONTENT_WIDTH / labels.length;
  const lineY = ctx.y;
  labels.forEach((label, i) => {
    const colX = MARGIN + i * colWidth;
    ctx.page.drawLine({
      start: { x: colX + 8, y: lineY },
      end: { x: colX + colWidth - 8, y: lineY },
      thickness: 0.75,
      color: INK,
    });
    const labelWidth = ctx.font.widthOfTextAtSize(label, 9);
    ctx.page.drawText(label, {
      x: colX + (colWidth - labelWidth) / 2,
      y: lineY - 12,
      size: 9,
      font: ctx.font,
      color: MUTED,
    });
  });
  ctx.y = lineY - 28;
}

function drawDisclaimer(ctx: RenderCtx): void {
  const note =
    'Bu belge YapıOps tarafından oluşturulmuş bir Ek-3 taslağıdır. Resmî başvuruda Çevre, ' +
    'Şehircilik ve İklim Değişikliği Bakanlığı’nın güncel formu esas alınmalıdır.';
  const lines = wrapText(note, ctx.font, 7.5, CONTENT_WIDTH);
  ensureSpace(ctx, lines.length * 10 + 8);
  ctx.y -= 6;
  lines.forEach((line) => {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y - 7.5, size: 7.5, font: ctx.font, color: MUTED });
    ctx.y -= 10;
  });
}

function stampFooters(doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((page, i) => {
    const label = `${String(i + 1)} / ${String(total)}`;
    const labelWidth = font.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: PAGE.width - MARGIN - labelWidth,
      y: 30,
      size: 8,
      font,
      color: MUTED,
    });
    page.drawText('YapıOps', { x: MARGIN, y: 30, size: 8, font, color: MUTED });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addPage(ctx: RenderCtx): void {
  ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height]);
  ctx.y = PAGE.height - MARGIN;
}

function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y - needed < BOTTOM_MARGIN) addPage(ctx);
}

/** Word-wrap `text` to `maxWidth`, hard-breaking any token longer than the column. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (text.length === 0) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (current.length > 0 && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.flatMap((line) => breakLongToken(line, font, size, maxWidth));
}

function breakLongToken(line: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(line, size) <= maxWidth) return [line];
  const out: string[] = [];
  let chunk = '';
  for (const ch of line) {
    const candidate = chunk + ch;
    if (chunk.length > 0 && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      out.push(chunk);
      chunk = ch;
    } else {
      chunk = candidate;
    }
  }
  if (chunk.length > 0) out.push(chunk);
  return out;
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Pure base64 → bytes decoder (no Buffer/atob dependency, so the package stays
 *  runtime-agnostic and needs no @types/node). */
function base64ToBytes(b64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64_ALPHABET.length; i += 1) lookup[B64_ALPHABET.charCodeAt(i)] = i;

  let outLength = Math.floor((b64.length * 3) / 4);
  if (b64.charCodeAt(b64.length - 1) === 0x3d) outLength -= 1; // '='
  if (b64.charCodeAt(b64.length - 2) === 0x3d) outLength -= 1;

  const bytes = new Uint8Array(outLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)] ?? 0;
    const e2 = lookup[b64.charCodeAt(i + 1)] ?? 0;
    const e3 = lookup[b64.charCodeAt(i + 2)] ?? 0;
    const e4 = lookup[b64.charCodeAt(i + 3)] ?? 0;
    if (p < outLength) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < outLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < outLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}
