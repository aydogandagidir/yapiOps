import type { Ek3FormData } from '@yapiops/ek3';

import { buildEk3FieldMap, type Ek3FieldMap } from './ek3-field-map';

/**
 * HTML fallback when the official Bakanlık template either is missing on disk
 * or does not expose AcroForm fields. Produces a self-contained HTML string
 * that the calling Next.js route can render to PDF via Puppeteer (Phase 2's
 * RaporX renderer reuses the same pipeline).
 *
 * The template tries to mirror the official form's section order and labels
 * but is **not** a substitute for the regulation-issued form. Use only when
 * the regulation form cannot be filled programmatically.
 */
export function buildEk3Html(form: Ek3FormData): string {
  const m: Ek3FieldMap = buildEk3FieldMap(form);

  const row = (label: string, value: string): string =>
    `<tr><th>${label}</th><td>${escape(value)}</td></tr>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Yapı Denetim Hizmet Sözleşmesi Ek-3</title>
<style>
  body { font-family: 'Times New Roman', serif; color: #111; padding: 32px; }
  h1 { font-size: 16pt; text-align: center; margin: 0 0 8px; }
  h2 { font-size: 12pt; margin: 24px 0 8px; border-bottom: 1px solid #999; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { width: 32%; text-align: left; font-weight: 600; padding: 4px 8px; vertical-align: top; }
  td { padding: 4px 8px; border-bottom: 1px dotted #bbb; }
  .signature { margin-top: 48px; display: flex; gap: 48px; }
  .signature div { flex: 1; border-top: 1px solid #333; padding-top: 4px; font-size: 10pt; text-align: center; }
  small { color: #666; }
</style>
</head>
<body>
  <h1>YAPI DENETİM HİZMET SÖZLEŞMESİ EK-3</h1>
  <p style="text-align:center"><small>Resmî Gazete: 30/05/2019 – 30789</small></p>

  <h2>1. Proje Bilgileri</h2>
  <table>
    ${row('Proje adı', m.proje_adi ?? '')}
    ${row('İl / İlçe / Mahalle', `${m.il ?? ''} / ${m.ilce ?? ''} / ${m.mahalle ?? ''}`)}
    ${row('Pafta / Ada / Parsel', `${m.pafta ?? ''} / ${m.ada ?? ''} / ${m.parsel ?? ''}`)}
    ${row('Koordinat', m.koordinat ?? '')}
    ${row('İmar durumu', m.imar_durumu ?? '')}
  </table>

  <h2>2. Yapı Bilgileri</h2>
  <table>
    ${row('Yapı sınıfı', m.yapi_sinifi ?? '')}
    ${row('Kullanım amacı', m.kullanim_amaci ?? '')}
    ${row('Toplam inşaat alanı (m²)', m.toplam_alan ?? '')}
    ${row('Bodrum kat sayısı', m.bodrum_kat ?? '')}
    ${row('Zemin üstü kat sayısı', m.zemin_ustu_kat ?? '')}
    ${row('Toplam yükseklik (m)', m.toplam_yukseklik ?? '')}
    ${row('Taşıyıcı sistem', m.tasiyici_sistem ?? '')}
    ${row('Deprem Tasarım Sınıfı (DTS)', m.dts ?? '')}
    ${row('Bina Yükseklik Sınıfı (BYS)', m.bys ?? '')}
    ${row('Sds / Sd1 / PGA', `${m.sds ?? '-'} / ${m.sd1 ?? '-'} / ${m.pga ?? '-'}`)}
  </table>

  <h2>3. İnşaat Bilgileri</h2>
  <table>
    ${row('Yapı ruhsat no / tarihi', `${m.yapi_ruhsat_no ?? ''} / ${m.yapi_ruhsat_tarihi ?? ''}`)}
    ${row('Başlama / Bitiş', `${m.insaat_baslama ?? ''} → ${m.insaat_bitis ?? ''}`)}
    ${row('Toplam süre (gün)', m.insaat_sure_gun ?? '')}
    ${row('İnşaat maliyeti (TRY)', m.insaat_maliyet ?? '')}
  </table>

  <h2>4. Yapı Sahibi</h2>
  <table>
    ${row('Ad soyad / Ünvan', m.sahibi_ad_soyad ?? '')}
    ${row('TCKN / VKN', `${m.sahibi_tckn ?? ''} ${m.sahibi_vkn ?? ''}`)}
    ${row('Adres', m.sahibi_adres ?? '')}
    ${row('Telefon / E-posta', `${m.sahibi_telefon ?? ''} / ${m.sahibi_eposta ?? ''}`)}
  </table>

  <h2>5. Yapı Müteahhidi</h2>
  <table>
    ${row('Ünvan / VKN', `${m.muteahhit_unvan ?? ''} / ${m.muteahhit_vkn ?? ''}`)}
    ${row('Yetki belgesi (sınıf / no)', `${m.muteahhit_yetki_belgesi_sinifi ?? ''} / ${m.muteahhit_yetki_belgesi_no ?? ''}`)}
    ${row('Yetkilisi (TCKN)', `${m.muteahhit_yetkili_adi ?? ''} (${m.muteahhit_yetkili_tckn ?? ''})`)}
    ${row('Adres', m.muteahhit_adres ?? '')}
    ${row('Telefon / E-posta', `${m.muteahhit_telefon ?? ''} / ${m.muteahhit_eposta ?? ''}`)}
  </table>

  <h2>6. Yapı Denetim Kuruluşu</h2>
  <table>
    ${row('Ünvan / VKN', `${m.denetim_unvan ?? ''} / ${m.denetim_vkn ?? ''}`)}
    ${row('İzin belgesi no', m.denetim_izin_belgesi_no ?? '')}
    ${row('Sorumlu mühendis', m.denetim_sorumlu_muhendis ?? '')}
    ${row('Oda sicil no', m.denetim_oda_sicil ?? '')}
    ${row('Adres', m.denetim_adres ?? '')}
    ${row('Telefon / E-posta', `${m.denetim_telefon ?? ''} / ${m.denetim_eposta ?? ''}`)}
  </table>

  <div class="signature">
    <div>Yapı Sahibi</div>
    <div>Yapı Müteahhidi</div>
    <div>Sorumlu Mühendis (e-imza)</div>
  </div>
</body>
</html>`;
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
