import type { Ek3FormData } from '@yapiops/ek3';
import { describe, expect, it } from 'vitest';

import { buildEk3FieldMap } from '../ek3-field-map';
import { buildEk3Html } from '../ek3-html-fallback';
import { renderEk3Pdf } from '../ek3-renderer';

const SAMPLE: Ek3FormData = {
  proje: {
    ad: 'Atatürk Bulvarı 4 Daireli Konut',
    il: 'Ankara',
    ilce: 'Çankaya',
    mahalle: 'Kavaklıdere',
    pafta: '12',
    ada: '345',
    parsel: '6',
    koordinat: { lat: 39.92077, lng: 32.85411 },
    imarDurumu: 'A-4 / Konut',
  },
  yapi: {
    sinif: '3A',
    kullanimAmaci: 'konut',
    toplamAlanM2: 1240,
    bodrumKat: 1,
    zeminUstuKat: 5,
    toplamYukseklikM: 16.4,
    tasiyiciSistem: 'BAC',
    dts: 2,
    bys: 7,
    sds: 0.62,
    sd1: 0.24,
    pga: 0.31,
  },
  insaat: {
    yapiRuhsatNo: '2026/1234',
    yapiRuhsatTarihi: '2026-04-15',
    baslamaTarihi: '2026-06-01',
    bitisTarihi: '2027-12-01',
    toplamSureGun: 549,
    maliyetTry: 12_500_000,
  },
  sahibi: {
    adSoyad: 'Mehmet Yılmaz',
    tckn: '12345678950',
    adres: 'Atatürk Bulvarı No:1, Ankara',
    telefon: '+905551112233',
    eposta: 'mehmet@example.com',
  },
  muteahhit: {
    unvan: 'ABC İnşaat Ltd. Şti.',
    vkn: '1234567890',
    yetkiBelgesiSinifi: 'B',
    yetkiBelgesiNo: '0001-2024',
    yetkili: { adSoyad: 'Ali Veli', tckn: '98765432150' },
    adres: 'Sanayi Cad. No:42, Ankara',
    telefon: '+903121112233',
    eposta: 'info@abcinsaat.com.tr',
  },
  denetim: {
    unvan: 'XYZ Yapı Denetim A.Ş.',
    vkn: '9876543210',
    izinBelgesiNo: 'YDK-12345',
    yetkili: { adSoyad: 'Ayşe Demir' },
    adres: 'Atatürk Mah. No:8, Ankara',
    telefon: '+903121234567',
    eposta: 'denetim@xyzdenetim.com.tr',
    sorumluMuhendis: { adSoyad: 'Hasan Çelik', odaSicilNo: 'IMO-78910' },
  },
};

describe('buildEk3FieldMap', () => {
  it('flattens an Ek-3 form into AcroForm field names', () => {
    const map = buildEk3FieldMap(SAMPLE);
    expect(map.proje_adi).toBe('Atatürk Bulvarı 4 Daireli Konut');
    expect(map.yapi_sinifi).toBe('3A');
    expect(map.toplam_alan).toContain('1.240');
    expect(map.dts).toBe('2');
    expect(map.bys).toBe('7');
    expect(map.sahibi_tckn).toBe('12345678950');
    expect(map.muteahhit_vkn).toBe('1234567890');
    expect(map.denetim_izin_belgesi_no).toBe('YDK-12345');
  });
});

describe('buildEk3Html', () => {
  it('produces HTML containing every section header', () => {
    const html = buildEk3Html(SAMPLE);
    expect(html).toContain('Proje Bilgileri');
    expect(html).toContain('Yapı Bilgileri');
    expect(html).toContain('Yapı Sahibi');
    expect(html).toContain('Yapı Müteahhidi');
    expect(html).toContain('Yapı Denetim Kuruluşu');
  });
});

describe('renderEk3Pdf', () => {
  it('renders a non-empty PDF using the HTML fallback when no template is supplied', async () => {
    const result = await renderEk3Pdf({ form: SAMPLE });
    expect(result.strategy).toBe('html-fallback');
    expect(result.bytes.byteLength).toBeGreaterThan(1000);
    // PDF magic bytes: %PDF-
    expect(result.bytes[0]).toBe(0x25);
    expect(result.bytes[1]).toBe(0x50);
    expect(result.bytes[2]).toBe(0x44);
    expect(result.bytes[3]).toBe(0x46);
  });
});
