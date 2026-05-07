import { describe, expect, it } from 'vitest';

import { mergeFormData } from '@/app/api/ek3/_helpers';

describe('mergeFormData', () => {
  it('returns the patch when existing is null', () => {
    const patch = { proje: { ad: 'Test' } };
    expect(mergeFormData(null, patch)).toEqual({ proje: { ad: 'Test' } });
  });

  it('shallow-merges sub-blocks of the same step', () => {
    const existing = { proje: { ad: 'Eski', il: 'Ankara' } };
    const patch = { proje: { ad: 'Yeni' } };
    expect(mergeFormData(existing, patch)).toEqual({
      proje: { ad: 'Yeni', il: 'Ankara' },
    });
  });

  it('preserves untouched steps', () => {
    const existing = {
      proje: { ad: 'P' },
      yapi: { sinif: '3A' as const },
    };
    const patch = { yapi: { dts: 2 as const } };
    expect(mergeFormData(existing, patch)).toEqual({
      proje: { ad: 'P' },
      yapi: { sinif: '3A', dts: 2 },
    });
  });

  it('skips undefined patch values without erasing existing', () => {
    const existing = { proje: { ad: 'P' } };
    const patch = { proje: undefined };
    expect(mergeFormData(existing, patch)).toEqual({ proje: { ad: 'P' } });
  });

  it('handles empty existing without crashing', () => {
    const patch = {
      sahibi: { adSoyad: 'Ali Veli', adres: 'Adres', tckn: '12345678950' },
    };
    expect(mergeFormData({}, patch)).toEqual(patch);
  });
});
