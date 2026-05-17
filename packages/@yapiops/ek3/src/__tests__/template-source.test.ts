import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  compareToActive,
  getActiveTemplate,
  getOfficialSources,
  sha256OfBytes,
} from '../template-source';

describe('sha256OfBytes', () => {
  it('produces a stable 64-char hex digest', () => {
    const bytes = new TextEncoder().encode('hello');
    const hash = sha256OfBytes(bytes);
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(hash).toHaveLength(64);
  });

  it('different inputs produce different digests', () => {
    expect(sha256OfBytes(new Uint8Array([1, 2, 3]))).not.toEqual(
      sha256OfBytes(new Uint8Array([1, 2, 4])),
    );
  });
});

describe('getOfficialSources', () => {
  const original = process.env.EK3_TEMPLATE_OFFICIAL_URLS;

  beforeEach(() => {
    delete process.env.EK3_TEMPLATE_OFFICIAL_URLS;
  });

  afterEach(() => {
    if (original != null) process.env.EK3_TEMPLATE_OFFICIAL_URLS = original;
    else delete process.env.EK3_TEMPLATE_OFFICIAL_URLS;
  });

  it('returns built-in defaults when env is empty', () => {
    const sources = getOfficialSources();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.some((s) => s.includes('csb.gov.tr'))).toBe(true);
  });

  it('overrides via env (comma-separated)', () => {
    process.env.EK3_TEMPLATE_OFFICIAL_URLS = 'https://example.com/a.pdf, https://example.com/b.pdf';
    const sources = getOfficialSources();
    expect(sources).toEqual(['https://example.com/a.pdf', 'https://example.com/b.pdf']);
  });

  it('skips empty entries from env', () => {
    process.env.EK3_TEMPLATE_OFFICIAL_URLS = 'https://example.com/a.pdf,,';
    expect(getOfficialSources()).toEqual(['https://example.com/a.pdf']);
  });
});

interface ActiveStub {
  id: string;
  sha256: string;
}

function mockTemplatesTable(active: ActiveStub | null): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: active, error: null }),
    })),
  } as unknown as SupabaseClient;
}

describe('getActiveTemplate', () => {
  it('returns the row when one is active', async () => {
    const supabase = mockTemplatesTable({ id: 't1', sha256: 'abc' });
    const row = await getActiveTemplate(supabase);
    expect(row?.id).toBe('t1');
  });

  it('returns null when none active', async () => {
    const supabase = mockTemplatesTable(null);
    expect(await getActiveTemplate(supabase)).toBeNull();
  });
});

describe('compareToActive', () => {
  it('returns "first" when no active row', async () => {
    const supabase = mockTemplatesTable(null);
    const cmp = await compareToActive(supabase, 'newhash');
    expect(cmp.status).toBe('first');
  });

  it('returns "unchanged" when hash matches', async () => {
    const supabase = mockTemplatesTable({ id: 't1', sha256: 'samehash' });
    const cmp = await compareToActive(supabase, 'samehash');
    expect(cmp.status).toBe('unchanged');
    if (cmp.status === 'unchanged') expect(cmp.activeId).toBe('t1');
  });

  it('returns "new" with previous activeId when hash differs', async () => {
    const supabase = mockTemplatesTable({ id: 't1', sha256: 'oldhash' });
    const cmp = await compareToActive(supabase, 'newhash');
    expect(cmp.status).toBe('new');
    if (cmp.status === 'new') expect(cmp.activeId).toBe('t1');
  });
});
