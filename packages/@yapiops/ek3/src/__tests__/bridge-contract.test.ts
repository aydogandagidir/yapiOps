import { describe, expect, it } from 'vitest';

import {
  Ek3EtabsImportSchema,
  type EtabsImportPayload,
  mapEtabsToYapi,
} from '../index';

/**
 * Bridge contract test'leri.
 *
 * Bu suite, Faz 1 Hafta 8–9'da .NET 8 WPF Bridge'inin göndereceği gerçek
 * payload örneklerini cloud-side validation + mapping zincirinden geçirir.
 * Bridge implementasyonu cloud'a değişiklik yapmadan başlamalıdır; herhangi
 * bir uyumsuzluk bu testlerde yakalanır.
 *
 * Örnek payload'lar `apps/desktop-bridge/src/YapiOps.Bridge.Etabs/Models/`
 * altında ileride üretilecek `Ek3MetadataPayload.cs` çıktısının ayna kopyaları.
 */

const FULL_BRIDGE_PAYLOAD: unknown = {
  projectId: '00000000-0000-0000-0000-000000000001',
  source: 'desktop-bridge',
  bridgeVersion: '1.0.0-alpha.1',
  etabs: {
    fileName: 'AnkaraKonut3KatBlokA.edb',
    etabsVersion: '21.2.0',
    metadata: {
      toplamAlanM2: 1240,
      bodrumKat: 1,
      zeminUstuKat: 5,
      toplamYukseklikM: 16.4,
      tasiyiciSistem: 'BAC',
      sds: 0.62,
      sd1: 0.24,
      koordinat: { lat: 39.92077, lng: 32.85411 },
    },
  },
};

const MERGE_BRIDGE_PAYLOAD: unknown = {
  ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
  ek3FormId: '00000000-0000-0000-0000-0000000000aa',
};

const PARTIAL_METADATA_PAYLOAD: unknown = {
  projectId: '00000000-0000-0000-0000-000000000002',
  source: 'desktop-bridge',
  bridgeVersion: '1.0.0',
  etabs: {
    fileName: 'eski-yapi.edb',
    metadata: { toplamAlanM2: 480, zeminUstuKat: 3 }, // sds yok, dtsHint çıkmaz
  },
};

const EMPTY_METADATA_PAYLOAD: unknown = {
  projectId: '00000000-0000-0000-0000-000000000003',
  source: 'desktop-bridge',
  bridgeVersion: '1.0.0',
  etabs: { fileName: 'sadece-isim.edb' },
};

describe('Ek3EtabsImportSchema — bridge payload contract', () => {
  it('accepts a fully populated bridge payload', () => {
    const result = Ek3EtabsImportSchema.safeParse(FULL_BRIDGE_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it('accepts the merge variant (ek3FormId present)', () => {
    expect(Ek3EtabsImportSchema.safeParse(MERGE_BRIDGE_PAYLOAD).success).toBe(true);
  });

  it('accepts payloads with only partial metadata', () => {
    expect(Ek3EtabsImportSchema.safeParse(PARTIAL_METADATA_PAYLOAD).success).toBe(true);
  });

  it('accepts payloads with no metadata at all (Bridge couldn\'t extract anything)', () => {
    expect(Ek3EtabsImportSchema.safeParse(EMPTY_METADATA_PAYLOAD).success).toBe(true);
  });

  it('rejects when source is not "desktop-bridge"', () => {
    const result = Ek3EtabsImportSchema.safeParse({
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      source: 'mobile-app',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when projectId is not a UUID', () => {
    const result = Ek3EtabsImportSchema.safeParse({
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      projectId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown tasiyiciSistem values', () => {
    const result = Ek3EtabsImportSchema.safeParse({
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      etabs: {
        fileName: 'x.edb',
        metadata: { tasiyiciSistem: 'AHSAP' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects coordinates outside Türkiye bounds', () => {
    const result = Ek3EtabsImportSchema.safeParse({
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      etabs: {
        fileName: 'x.edb',
        metadata: { koordinat: { lat: 50, lng: 32 } },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative numeric metadata', () => {
    const result = Ek3EtabsImportSchema.safeParse({
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      etabs: {
        fileName: 'x.edb',
        metadata: { toplamAlanM2: -50 },
      },
    });
    expect(result.success).toBe(false);
  });

  it('requires bridgeVersion to be a non-empty string', () => {
    const result = Ek3EtabsImportSchema.safeParse({
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      bridgeVersion: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('mapEtabsToYapi — cloud-side ETABS → form mapping', () => {
  function asPayload(raw: unknown): EtabsImportPayload {
    return Ek3EtabsImportSchema.parse(raw);
  }

  it('passes through every metadata field 1:1 for the full payload', () => {
    const yapi = mapEtabsToYapi(asPayload(FULL_BRIDGE_PAYLOAD));
    expect(yapi.toplamAlanM2).toBe(1240);
    expect(yapi.bodrumKat).toBe(1);
    expect(yapi.zeminUstuKat).toBe(5);
    expect(yapi.toplamYukseklikM).toBe(16.4);
    expect(yapi.tasiyiciSistem).toBe('BAC');
    expect(yapi.sds).toBe(0.62);
    expect(yapi.sd1).toBe(0.24);
  });

  it('derives dtsHint=2 from Sds=0.62 (TBDY Tablo 3.2)', () => {
    const yapi = mapEtabsToYapi(asPayload(FULL_BRIDGE_PAYLOAD));
    expect(yapi.dtsHint).toBe(2);
  });

  it('derives dtsHint=1 from Sds≥0.75', () => {
    const high: unknown = {
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      etabs: { fileName: 'high.edb', metadata: { sds: 0.85 } },
    };
    expect(mapEtabsToYapi(asPayload(high)).dtsHint).toBe(1);
  });

  it('derives dtsHint=4 from Sds<0.33', () => {
    const low: unknown = {
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      etabs: { fileName: 'low.edb', metadata: { sds: 0.18 } },
    };
    expect(mapEtabsToYapi(asPayload(low)).dtsHint).toBe(4);
  });

  it('omits dtsHint when Sds is missing', () => {
    const yapi = mapEtabsToYapi(asPayload(PARTIAL_METADATA_PAYLOAD));
    expect(yapi.dtsHint).toBeUndefined();
    expect(yapi.toplamAlanM2).toBe(480);
  });

  it('returns an empty-but-defined object when metadata is absent', () => {
    const yapi = mapEtabsToYapi(asPayload(EMPTY_METADATA_PAYLOAD));
    expect(yapi).toEqual({
      toplamAlanM2: undefined,
      bodrumKat: undefined,
      zeminUstuKat: undefined,
      toplamYukseklikM: undefined,
      tasiyiciSistem: undefined,
      sds: undefined,
      sd1: undefined,
    });
  });

  it('does not leak unknown metadata keys into the mapped fields', () => {
    const withExtra: unknown = {
      ...(FULL_BRIDGE_PAYLOAD as Record<string, unknown>),
      etabs: {
        fileName: 'x.edb',
        metadata: {
          toplamAlanM2: 100,
          // Bridge ileride ek alan eklerse Zod strip eder, mapping görmez:
          eksenelKuvvet: 999,
          maksimumKesme: 999,
        },
      },
    };
    const yapi = mapEtabsToYapi(asPayload(withExtra));
    expect(yapi).not.toHaveProperty('eksenelKuvvet');
    expect(yapi).not.toHaveProperty('maksimumKesme');
  });
});
