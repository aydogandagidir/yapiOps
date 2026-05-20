# Modül: BillingCore

> **Lansman:** Faz 0 paralel + Faz 1 (Hafta 1–12)
> **Öncelik:** P0 (her modül buna bağlı)
> **Bağımlılık:** Iyzico, Foriba (veya Logo) e-Fatura, GİB

## 1. Vaat

Türkiye'ye özgü self-serve abonelik altyapısı: kart ile online satın al, otomatik yenile, e-fatura kes, KDV doğru hesapla, multi-seat yönet.

**Yapısal avantaj:** Demir'de bu yok — müşteri DM'le manuel sözleşme yapıyor. Bizim "tıkla-dene-abone-ol" akışımız tek başına %30+ dönüşüm avantajı sağlar.

## 2. Akış: Müşteri yolculuğu

### S1: Yeni kayıt → 14 gün ücretsiz deneme

1. Web'de "Ücretsiz dene" → email/şifre
2. Email doğrulama
3. Organizasyon kurulumu (firma adı, VKN opsiyonel)
4. **Kart bilgisi GEREKMEZ** (sadece deneme)
5. 14 gün tüm modüllere erişim
6. Deneme süresi sonunda: "Devam etmek için plan seçin" CTA

### S2: Plan satın alma

1. Plan seç (Solo / Office / Office+AI)
2. Aylık vs yıllık (yıllık %15 indirim)
3. Iyzico checkout (kart kaydet)
4. VKN doğrulama (opsiyonel ama e-fatura için gerekli)
5. KVKK onay + Kullanım Şartları
6. Ödeme → 30 saniye içinde aktivasyon
7. E-fatura otomatik kesilir, mail ile iletilir

### S3: Yenileme

- 3 gün önce email hatırlatma
- Otomatik tahsilat (kart saklı)
- Başarısız → 3 retry (1 gün, 3 gün, 7 gün)
- Hâlâ başarısız → plan downgrade (sadece okuma erişimi)

### S4: İptal

- Settings → "Aboneliği iptal et"
- "Neden iptal ediyorsunuz?" anketi (opsiyonel)
- Mevcut dönem sonuna kadar erişim devam eder
- Veri 90 gün soft delete sonra hard delete (KVKK)

## 3. Iyzico entegrasyonu

### 3.1 Neden Iyzico

- Türkiye'de en yaygın, e-Arşiv entegre
- Subscription API var (Stripe gibi recurring)
- Türk Lirası native, KDV hesaplama hazır
- 3D Secure mecburi mevzuat uyumu

### 3.2 Subscription akışı

```typescript
// packages/@yapiops/billing/src/iyzico.ts

export async function createSubscription(params: {
  orgId: string;
  planCode:
    | 'solo_monthly'
    | 'office_monthly'
    | 'office_ai_monthly'
    | 'solo_yearly'
    | 'office_yearly'
    | 'office_ai_yearly';
  cardToken: string; // Iyzico checkout'tan dönen token
  customer: CustomerInfo;
}): Promise<Subscription> {
  // 1. Iyzico subscription customer oluştur
  const customer = await iyzico.subscriptionCustomer.create({
    name: params.customer.fullName,
    surname: params.customer.surname,
    email: params.customer.email,
    gsmNumber: params.customer.phone,
    identityNumber: params.customer.tckn,
    billingAddress: params.customer.address,
  });

  // 2. Subscription başlat
  const subscription = await iyzico.subscription.initialize({
    customerReferenceCode: customer.referenceCode,
    pricingPlanReferenceCode: PLAN_CODES[params.planCode],
    paymentCard: { cardToken: params.cardToken },
  });

  // 3. DB'ye yaz
  await db.subscriptions.insert({
    org_id: params.orgId,
    iyzico_subscription_id: subscription.referenceCode,
    plan_code: params.planCode,
    status: 'trialing', // İlk 14 gün
    current_period_start: new Date(),
    current_period_end: addDays(new Date(), 14),
    trial_end: addDays(new Date(), 14),
  });

  // 4. Audit
  await audit.log('subscription.created', { orgId: params.orgId, plan: params.planCode });

  return subscription;
}
```

### 3.3 Webhook handler

Iyzico ödeme olayları → `/api/webhooks/iyzico`:

```typescript
// apps/web/app/api/webhooks/iyzico/route.ts

export async function POST(req: Request) {
  // 1. Imza doğrula
  const signature = req.headers.get('x-iyz-signature');
  if (!verifyIyzicoSignature(await req.text(), signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = await req.json();

  switch (event.type) {
    case 'subscription.payment_succeeded':
      await handlePaymentSucceeded(event);
      // → invoices tablosuna yaz
      // → Foriba'da e-fatura kes
      // → Email gönder
      break;

    case 'subscription.payment_failed':
      await handlePaymentFailed(event);
      // → Email "ödeme başarısız, kartı güncelleyin"
      // → Retry zamanla
      break;

    case 'subscription.canceled':
      await handleCanceled(event);
      break;
  }

  return new Response('OK');
}
```

## 4. E-fatura entegrasyonu

### 4.1 Sağlayıcı seçimi

**Birinci tercih:** Foriba (https://www.foriba.com/) — geniş API, Türkçe doküman, KOBİ dostu

**Alternatifler:**

- Logo e-Fatura (Logo Yazılım)
- Mikro Yazılım
- BulutFatura

> **Karar:** POC ile Foriba ve Logo'yu test et, fiyat + API kalitesi değerlendir.

### 4.2 E-fatura akışı

```typescript
// packages/@yapiops/billing/src/efatura.ts

export async function eArşivFaturaKes(payment: PaymentRecord): Promise<EFaturaResult> {
  const fatura = {
    faturaTipi: payment.org.taxNumber ? 'TICARI' : 'BIREYSEL',
    aliciVKN: payment.org.taxNumber,
    aliciTCKN: payment.org.taxNumber ? null : payment.user.tckn,
    aliciAdSoyad: payment.org.name,
    aliciAdres: payment.org.billingAddress,

    kalemler: [
      {
        ad: getPlanName(payment.plan_code),
        miktar: 1,
        birim: 'AY',
        birimFiyat: payment.amount_try / 1.2, // KDV hariç
        kdvOrani: 20,
        kdvTutari: payment.amount_try - payment.amount_try / 1.2,
        toplam: payment.amount_try,
      },
    ],

    odenenTutar: payment.amount_try,
    odemeYontemi: 'KREDI_KARTI',
    duzenlenmeTarihi: new Date(),
  };

  const result = await foriba.fatura.olustur(fatura);

  // GİB onayı bekle (genelde anlık)
  await waitForGibApproval(result.uuid);

  return {
    uuid: result.uuid,
    pdfUrl: result.pdfUrl,
    xmlUrl: result.xmlUrl,
    eTtnNumber: result.eTtnNumber,
  };
}
```

### 4.3 KDV doğru hesaplama

- Türkiye'de yazılım hizmetleri %20 KDV (2024 itibarıyla; oran değişebilir, config'den oku)
- Yurt dışı müşteri (TCKN/VKN yok, IP yurt dışı): KDV %0 (ihracat istisnası — Faz 4'te ele alınacak)
- Müstahsil makbuzu / SMMM kesinti durumu: muhasebeci ile kontrol

> **Önemli:** Faz 1 lansmanında **sadece TR şirketleri ve şahısları** hedef. Yurt dışı satışı Faz 4'e ertelendi (e-ihracat faturası ayrı süreç).

## 5. Plan ve fiyat yönetimi

### 5.1 Plan tanımı (config-driven)

```typescript
// packages/@yapiops/billing/src/plans.ts

export const PLANS = {
  free: {
    code: 'free',
    name: 'Ücretsiz',
    monthlyPrice: 0,
    yearlyPrice: 0,
    seats: 1,
    features: {
      ek3pilot: { enabled: true, monthlyLimit: 3 },
      raporx: { enabled: false },
      spektrumhub: { enabled: false },
      copilot: { enabled: false },
      audit: { enabled: false },
      sso: false,
    },
  },
  solo_monthly: {
    code: 'solo_monthly',
    name: 'Solo (Aylık)',
    monthlyPrice: 1500,
    seats: 1,
    features: {
      ek3pilot: { enabled: true, monthlyLimit: -1 },
      raporx: { enabled: true, monthlyLimit: 5 },
      spektrumhub: { enabled: false },
      copilot: { enabled: false },
      audit: { enabled: true, retention: '90d' },
      sso: false,
    },
  },
  office_monthly: {
    code: 'office_monthly',
    name: 'Ofis (Aylık)',
    monthlyPrice: 2500,
    seats: 3,
    features: {
      ek3pilot: { enabled: true, monthlyLimit: -1 },
      raporx: { enabled: true, monthlyLimit: 50 },
      spektrumhub: { enabled: true, monthlyLimit: 30 },
      copilot: { enabled: false },
      audit: { enabled: true, retention: '5y' },
      sso: false,
    },
  },
  office_ai_monthly: {
    code: 'office_ai_monthly',
    name: 'Ofis + AI (Aylık)',
    monthlyPrice: 3500,
    seats: 5,
    features: {
      ek3pilot: { enabled: true, monthlyLimit: -1 },
      raporx: { enabled: true, monthlyLimit: -1 },
      spektrumhub: { enabled: true, monthlyLimit: -1 },
      copilot: { enabled: true, monthlyLimit: 200 },
      audit: { enabled: true, retention: '5y' },
      sso: false,
    },
  },
  enterprise: {
    code: 'enterprise',
    name: 'Kurumsal',
    monthlyPrice: null, // Özel
    seats: 10, // Başlangıç, +ekleme mümkün
    features: {
      // Tümü sınırsız
      ek3pilot: { enabled: true, monthlyLimit: -1 },
      raporx: { enabled: true, monthlyLimit: -1 },
      spektrumhub: { enabled: true, monthlyLimit: -1 },
      copilot: { enabled: true, monthlyLimit: -1 },
      audit: { enabled: true, retention: '10y' },
      sso: true,
      sla: true,
    },
  },
} as const;
```

### 5.2 Yıllık planlar

Aylık fiyat × 12 × 0.85 (%15 yıllık indirim).

## 6. Multi-seat yönetimi

### 6.1 Yetki

- **Owner:** Plan değiştirme, fatura görme, seat ekleme/çıkarma, organizasyon silme
- **Admin:** Seat ekleme, kullanıcı davet, plan görüntüleme (değiştiremez)
- **Engineer:** Sadece kendi modül erişimi
- **Auditor:** Sadece okuma

### 6.2 Seat ekleme/çıkarma

- Anlık prorate hesaplama (Iyzico subscription update)
- Ek seat aylık ₺350 / yıllık ₺3.570
- Çıkarılan seat'in mevcut dönem sonuna kadar erişimi var

## 7. Kullanım izleme

```typescript
// packages/@yapiops/billing/src/usage.ts

export async function checkAndIncrementUsage(params: {
  orgId: string;
  feature: 'ek3' | 'raporx' | 'spektrum' | 'copilot';
}): Promise<UsageCheckResult> {
  const subscription = await getActiveSubscription(params.orgId);
  const plan = PLANS[subscription.plan_code];
  const limit = plan.features[params.feature]?.monthlyLimit;

  if (limit === undefined || !plan.features[params.feature].enabled) {
    return { allowed: false, reason: 'PLAN_DOES_NOT_INCLUDE_FEATURE' };
  }

  if (limit === -1) {
    // Sınırsız
    await incrementUsage(params.orgId, params.feature);
    return { allowed: true, remaining: -1 };
  }

  const currentUsage = await getCurrentMonthUsage(params.orgId, params.feature);
  if (currentUsage >= limit) {
    return {
      allowed: false,
      reason: 'MONTHLY_LIMIT_REACHED',
      limit,
      current: currentUsage,
      upgradeOptions: getUpgradeOptions(subscription.plan_code),
    };
  }

  await incrementUsage(params.orgId, params.feature);
  return { allowed: true, remaining: limit - currentUsage - 1 };
}
```

## 8. Veri modeli

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL UNIQUE,
  iyzico_subscription_id TEXT UNIQUE,
  iyzico_customer_id TEXT,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,           -- 'trialing','active','past_due','canceled','expired'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  iyzico_payment_id TEXT,
  amount_try NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(4,2) NOT NULL DEFAULT 20,
  vat_amount NUMERIC(10,2) NOT NULL,
  total_with_vat NUMERIC(10,2) NOT NULL,
  e_invoice_uuid TEXT,
  e_invoice_status TEXT,          -- 'pending','approved','rejected'
  e_invoice_pdf_url TEXT,
  e_invoice_xml_url TEXT,
  ettn TEXT,                      -- E-Fatura ETTN numarası
  status TEXT NOT NULL,           -- 'paid','pending','failed','refunded'
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  feature TEXT NOT NULL,          -- 'ek3','raporx','spektrum','copilot'
  resource_id UUID,
  cost_usd NUMERIC(10,6),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_org_feature_month ON usage_records(
  org_id, feature, date_trunc('month', created_at)
);

CREATE TABLE seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  role TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id, removed_at)
);
```

## 9. UI

### 9.1 Sayfalar

```
apps/web/app/(dashboard)/billing/
├── page.tsx                     # Plan + kullanım özeti
├── invoices/                    # Fatura listesi
├── payment-method/              # Kart yönetimi
└── upgrade/                     # Plan yükseltme

apps/web/app/(dashboard)/admin/
├── seats/                       # Seat yönetimi (owner/admin)
└── usage/                       # Detaylı kullanım istatistikleri
```

## 10. API endpoint'leri

```
POST   /api/billing/checkout            # Iyzico checkout başlat
POST   /api/webhooks/iyzico             # Webhook
GET    /api/billing/subscription        # Mevcut abonelik
POST   /api/billing/upgrade             # Plan değiştir
POST   /api/billing/cancel              # İptal
GET    /api/billing/invoices            # Fatura listesi
GET    /api/billing/invoices/:id/pdf    # E-fatura PDF
POST   /api/billing/seats               # Seat ekle
DELETE /api/billing/seats/:id           # Seat çıkar
GET    /api/billing/usage               # Kullanım özeti (mevcut ay)
```

## 11. Kritik test senaryoları

1. **Yeni kullanıcı 14 gün dene → satın al** akışı
2. **Yenileme başarılı** → fatura kesilir, email gider
3. **Yenileme başarısız** → 3 retry, sonra downgrade
4. **Plan upgrade** mid-cycle → prorate doğru
5. **İptal** → erişim mevcut dönem sonuna kadar
6. **Seat ekle** → Iyzico subscription güncellenir, prorate
7. **Limit aşımı** → kullanıcıya net mesaj + upgrade CTA
8. **VKN olmadan ödeme** → bireysel e-arşiv kesilir
9. **Yanlış kart** → 3D Secure başarısız → kullanıcı tekrar dener
10. **Webhook çakışması** (aynı event 2 kez) → idempotent işlem

## 12. Lansman kriterleri (DoD — Faz 1)

- [ ] Iyzico subscription canlı, gerçek kart ile test edildi
- [ ] Foriba (veya Logo) e-fatura entegrasyonu çalışıyor, GİB'de ilk fatura görünüyor
- [ ] 14 gün ücretsiz deneme akışı uçtan uca çalışıyor
- [ ] Webhook idempotent ve imza doğrulamalı
- [ ] KVKK aydınlatma metni + Kullanım Şartları yayında
- [ ] Audit log tüm billing olaylarını kaydediyor
- [ ] Kullanım sınırı kontrolleri tüm modüllerde aktif
- [ ] Multi-seat ekleme/çıkarma çalışıyor
- [ ] İlk gerçek müşteri ödemesi alındı, e-fatura ulaştı
