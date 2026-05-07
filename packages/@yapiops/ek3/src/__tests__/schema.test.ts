import { describe, expect, it } from 'vitest';

import { Ek3FormDataSchema, KoordinatSchema, YapiSchema } from '../schema';

describe('KoordinatSchema', () => {
  it('accepts coordinates within Türkiye bounds', () => {
    expect(KoordinatSchema.safeParse({ lat: 39.92, lng: 32.85 }).success).toBe(true);
  });

  it('rejects out-of-bounds coordinates', () => {
    expect(KoordinatSchema.safeParse({ lat: 50, lng: 32.85 }).success).toBe(false);
    expect(KoordinatSchema.safeParse({ lat: 39, lng: 50 }).success).toBe(false);
  });
});

describe('YapiSchema', () => {
  it('accepts a valid yapi block', () => {
    const result = YapiSchema.safeParse({
      sinif: '3A',
      kullanimAmaci: 'konut',
      toplamAlanM2: 850,
      bodrumKat: 1,
      zeminUstuKat: 5,
      toplamYukseklikM: 16.5,
      tasiyiciSistem: 'BAC',
      dts: 2,
      bys: 7,
      sds: 0.6,
      sd1: 0.25,
    });
    expect(result.success).toBe(true);
  });

  it('rejects DTS outside 1–4', () => {
    const result = YapiSchema.safeParse({
      sinif: '3A',
      kullanimAmaci: 'konut',
      toplamAlanM2: 850,
      bodrumKat: 1,
      zeminUstuKat: 5,
      toplamYukseklikM: 16.5,
      tasiyiciSistem: 'BAC',
      dts: 5,
      bys: 7,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative area', () => {
    const result = YapiSchema.safeParse({
      sinif: '3A',
      kullanimAmaci: 'konut',
      toplamAlanM2: -1,
      bodrumKat: 1,
      zeminUstuKat: 5,
      toplamYukseklikM: 16.5,
      tasiyiciSistem: 'BAC',
      dts: 2,
      bys: 7,
    });
    expect(result.success).toBe(false);
  });
});

describe('Ek3FormDataSchema', () => {
  it('rejects when sahibi has neither TCKN nor VKN', () => {
    const result = Ek3FormDataSchema.safeParse({
      proje: {
        ad: 'Test Projesi',
        il: 'Ankara',
        ilce: 'Çankaya',
        ada: '123',
        parsel: '4',
      },
      yapi: {
        sinif: '3A',
        kullanimAmaci: 'konut',
        toplamAlanM2: 850,
        bodrumKat: 1,
        zeminUstuKat: 5,
        toplamYukseklikM: 16.5,
        tasiyiciSistem: 'BAC',
        dts: 2,
        bys: 7,
      },
      insaat: {
        baslamaTarihi: '2026-06-01',
        bitisTarihi: '2027-12-01',
        toplamSureGun: 549,
        maliyetTry: 12500000,
      },
      sahibi: {
        adSoyad: 'Ali Veli',
        adres: 'Atatürk Bulvarı No:1, Ankara',
      },
      muteahhit: {
        unvan: 'Müteahhit Ltd.',
        vkn: '1234567890',
        yetkili: { adSoyad: 'Yetkili Adı' },
        adres: 'Adres',
      },
      denetim: {
        unvan: 'Denetim A.Ş.',
        vkn: '9876543210',
        yetkili: { adSoyad: 'Yetkili Adı' },
        adres: 'Adres',
        izinBelgesiNo: 'YDK-001',
        sorumluMuhendis: { adSoyad: 'Mühendis Adı', odaSicilNo: 'IMO-12345' },
      },
    });
    expect(result.success).toBe(false);
  });
});
