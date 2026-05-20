import { z } from 'zod';

import { calculateVat } from '../plans';

export type FaturaTipi = 'TICARI' | 'BIREYSEL';

export interface FaturaKalemi {
  description: string;
  quantity: number;
  unitPriceTry: number;
}

export interface KesEFaturaInput {
  alici: {
    fullName: string;
    email: string;
    /** VKN (10 digits) → TICARI, TCKN (11 digits) → BIREYSEL */
    vknOrTckn: string;
    address: string;
    city: string;
    country: string;
  };
  kalemler: FaturaKalemi[];
  faturaNo?: string;
  faturaTarihi?: Date;
}

export interface EFaturaResult {
  uuid: string;
  ettn: string;
  toplam: { priceExclVat: number; vat: number; total: number };
  faturaTipi: FaturaTipi;
  status: 'submitted' | 'accepted' | 'rejected';
  raw: unknown;
}

const foribaResponseSchema = z.object({
  uuid: z.string(),
  ettn: z.string(),
  status: z.enum(['submitted', 'accepted', 'rejected']),
});

/**
 * Issues an e-Arşiv invoice via Foriba. Phase 0 implementation talks to
 * Foriba's sandbox; replace with a hardened HTTP client + retry queue in
 * Phase 1 once Inngest is wired.
 *
 * KDV (VAT) is fixed at 20% for B2B SaaS in Türkiye as of 2024-07-10. This
 * matches modules/billing.md §4 and the `calculateVat` helper.
 */
export async function eArsivFaturaKes(input: KesEFaturaInput): Promise<EFaturaResult> {
  const baseUrl = process.env.FORIBA_BASE_URL;
  const username = process.env.FORIBA_USERNAME;
  const password = process.env.FORIBA_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing Foriba credentials: FORIBA_BASE_URL, FORIBA_USERNAME, FORIBA_PASSWORD',
    );
  }

  const faturaTipi: FaturaTipi = input.alici.vknOrTckn.length === 10 ? 'TICARI' : 'BIREYSEL';
  const subtotal = input.kalemler.reduce((acc, k) => acc + k.quantity * k.unitPriceTry, 0);
  const totals = calculateVat(subtotal);

  const payload = {
    invoiceProfile: 'EARSIVFATURA',
    invoiceTypeCode: 'SATIS',
    documentCurrencyCode: 'TRY',
    issueDate: (input.faturaTarihi ?? new Date()).toISOString().slice(0, 10),
    invoiceNumber: input.faturaNo ?? null,
    customer: {
      partyIdentification: input.alici.vknOrTckn,
      partyName: input.alici.fullName,
      contact: { electronicMail: input.alici.email },
      postalAddress: {
        streetName: input.alici.address,
        cityName: input.alici.city,
        country: input.alici.country,
      },
    },
    invoiceLines: input.kalemler.map((k, i) => ({
      id: i + 1,
      invoicedQuantity: k.quantity,
      lineExtensionAmount: k.quantity * k.unitPriceTry,
      item: { name: k.description },
      taxTotal: {
        taxAmount: calculateVat(k.quantity * k.unitPriceTry).vat,
        taxSubtotal: { taxableAmount: k.quantity * k.unitPriceTry, percent: 20 },
      },
    })),
    legalMonetaryTotal: {
      lineExtensionAmount: totals.priceExclVat,
      taxExclusiveAmount: totals.priceExclVat,
      taxInclusiveAmount: totals.total,
      payableAmount: totals.total,
    },
  };

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const response = await fetch(`${baseUrl}/v1/eArsivInvoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Foriba API error ${String(response.status)}: ${errBody}`);
  }

  const json: unknown = await response.json();
  const parsed = foribaResponseSchema.parse(json);

  return {
    uuid: parsed.uuid,
    ettn: parsed.ettn,
    toplam: totals,
    faturaTipi,
    status: parsed.status,
    raw: json,
  };
}
