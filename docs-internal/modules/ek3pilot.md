# Modül: Ek3Pilot

> **Lansman:** Faz 1 (Hafta 5–12)
> **Öncelik:** P0 (MVP)
> **Bağımlılık:** BillingCore, Auth, Audit

## 1. Vaat

Yapı Denetim Hizmet Sözleşmesi Ek-3 formunu 5 dakikada doldur, e-imza-ready PDF üret. ETABS modeli varsa metadata otomatik dolar; yoksa manuel mod.

## 2. Kullanıcı senaryoları

### S1: ETABS'lı hızlı yol

1. Mühendis ETABS modelini açar, masaüstü bridge'i başlatır
2. Bridge "Ek-3 oluştur" butonu → cloud'da yeni form açılır
3. Kat sayısı, alan, DTS, BYS, Sds/Sd1, koordinat OTOMATİK dolar
4. Mühendis sahibi/müteahhit/yapı denetim firma bilgilerini ekler (kayıtlı şablondan seçer)
5. "PDF üret" → e-imza-ready PDF indirilir
6. **Toplam süre: 3–5 dakika**

### S2: Manuel yol (ETABS yok)

1. Mühendis web'de "Yeni Ek-3" tıklar
2. 6 sekmeli form doldurur (proje / yapı / inşaat / firma / sahibi / müteahhit)
3. Validate → PDF üretir
4. **Toplam süre: 10–15 dakika** (geleneksel 30–60 dk yerine)

### S3: Revize akışı

1. Mevcut Ek-3'ü aç → "Yeni versiyon"
2. Değişen alanları güncelle → eskisi `superseded` olarak arşivlenir, yenisi v2 olur
3. Değişiklik gerekçesi yazılır, audit log'a düşer

## 3. Form alanları (RG-30/05/2019-30789 referansı)

> **Not:** Resmi Ek-3 formu yönetmelik ekinde tanımlı. Aşağıdaki alanlar formun temel yapısını yansıtır; **uygulama öncesi resmi formla bire bir karşılaştırma yapılmalı** (Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'nın güncel formu kontrol edilmeli).

### 3.1 Proje bilgileri

- Proje adı
- İl / İlçe / Mahalle
- Pafta / Ada / Parsel no
- Koordinat (lat/lng) — AFAD entegrasyonu için kritik
- İmar durumu

### 3.2 Yapı bilgileri

- Yapı sınıfı (1A/1B/2A/2B/3A/3B/4A/4B/5A) — yönetmelik tablosundan
- Kullanım amacı (konut / ticaret / sanayi / sağlık / eğitim / vb.)
- Toplam inşaat alanı (m²)
- Bodrum kat sayısı
- Zemin üstü kat sayısı
- Toplam yükseklik (m)
- Taşıyıcı sistem (BAÇ / BAP / BAÇ-BAP / Yığma / Çelik / Karma)
- Deprem Tasarım Sınıfı (DTS 1–4)
- Bina Yükseklik Sınıfı (BYS 1–8)
- Tasarım sınıfı (Sds, Sd1, PGA)

### 3.3 İnşaat bilgileri

- Yapı ruhsat no ve tarihi
- İnşaat başlama tarihi
- Tahmini bitiş tarihi
- Toplam inşaat süresi (gün)
- İnşaat maliyeti (₺)

### 3.4 Yapı sahibi

- Ad soyad / Ünvan
- TCKN / VKN
- Adres
- Telefon
- E-posta

### 3.5 Yapı müteahhidi

- Ünvan
- VKN
- Yetki belgesi sınıfı ve no
- Yetkilisi (ad soyad, TCKN)
- Adres / İletişim

### 3.6 Yapı denetim kuruluşu

- Ünvan
- İzin belgesi no
- Adres / İletişim
- Sorumlu mühendis (ad soyad, oda sicil)

## 4. Veri modeli

```typescript
// packages/@yapiops/ek3/src/types.ts

export interface Ek3Form {
  id: string;
  projectId: string;
  version: number;
  status: 'draft' | 'completed' | 'signed' | 'superseded';

  proje: ProjeBilgileri;
  yapi: YapiBilgileri;
  insaat: InsaatBilgileri;
  sahibi: KisiBilgileri;
  muteahhit: FirmaBilgileri;
  denetim: YapiDenetimBilgileri;

  generatedAt?: string;
  pdfUrl?: string;
  supersededBy?: string; // Sonraki versiyon ID
  supersedes?: string; // Önceki versiyon ID
  revisionReason?: string;
}

export const Ek3FormSchema = z.object({
  proje: z.object({
    ad: z.string().min(3).max(200),
    il: z.string(),
    ilce: z.string(),
    mahalle: z.string().optional(),
    pafta: z.string().optional(),
    ada: z.string(),
    parsel: z.string(),
    koordinat: z
      .object({
        lat: z.number().min(35).max(43), // Türkiye sınırları
        lng: z.number().min(25).max(45),
      })
      .optional(),
    imarDurumu: z.string().optional(),
  }),
  yapi: z.object({
    sinif: z.enum(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A']),
    kullanimAmaci: z.string(),
    toplamAlanM2: z.number().positive(),
    bodrumKat: z.number().int().min(0),
    zeminUstuKat: z.number().int().min(0),
    toplamYukseklikM: z.number().positive(),
    tasiyiciSistem: z.enum(['BAC', 'BAP', 'BAC-BAP', 'YIGMA', 'CELIK', 'KARMA']),
    dts: z.number().int().min(1).max(4),
    bys: z.number().int().min(1).max(8),
    sds: z.number().positive().optional(),
    sd1: z.number().positive().optional(),
    pga: z.number().positive().optional(),
  }),
  // ... diğer bölümler benzer şekilde
});
```

## 5. ETABS metadata mapping

Bridge'in ETABS modelinden çıkarması gereken alanlar:

| Ek-3 alanı            | ETABS kaynak                         | OAPI çağrısı                              |
| --------------------- | ------------------------------------ | ----------------------------------------- |
| Toplam alan           | Story tanımları + Slab area          | `SapModel.AreaObj.GetAllAreas()` + filtre |
| Bodrum kat sayısı     | Story Z koordinatı < 0               | `SapModel.Story.GetStories()`             |
| Zemin üstü kat sayısı | Story Z koordinatı ≥ 0               | aynı                                      |
| Toplam yükseklik      | Max(Story Z) - Min(Story Z)          | aynı                                      |
| Taşıyıcı sistem       | Wall + Column varlığına göre çıkarım | `GetAllFrames`, `GetAllAreas`             |
| Sds, Sd1              | Response spectrum function           | `SapModel.Func.FuncRS.*`                  |
| DTS, BYS              | Sds + bina yüksekliğinden hesap      | TBDY 4.4.1 + 3.3.1 tabloları              |

> **Not:** DTS ve BYS, Sds ve toplam yükseklik girdileriyle TBDY 2018 tablolarından **deterministik** çıkar. Ek3Pilot bu hesabı yapar; kullanıcı override edebilir.

## 6. PDF üretimi

### 6.1 Yaklaşım

- Resmi Ek-3 PDF formu (Çevre Şehircilik Bakanlığı sitesinden) → form alanları (AcroForm) ile doldurulur
- `pdf-lib` ile alan-alan yazma
- E-imza için imza alanı bırakılır (boş PDF signature field)

### 6.2 Implementasyon

```typescript
// packages/@yapiops/pdf/src/ek3-renderer.ts
import { PDFDocument } from 'pdf-lib';

export async function renderEk3Pdf(form: Ek3Form): Promise<Uint8Array> {
  const templateBytes = await fetch('/templates/ek3-resmi-form.pdf').then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const formFields = pdfDoc.getForm();

  // Alan-alan doldur
  formFields.getTextField('proje_adi').setText(form.proje.ad);
  formFields.getTextField('il').setText(form.proje.il);
  formFields.getTextField('ada').setText(form.proje.ada);
  formFields.getTextField('parsel').setText(form.proje.parsel);
  formFields.getTextField('toplam_alan').setText(form.yapi.toplamAlanM2.toLocaleString('tr-TR'));
  // ... tüm alanlar

  // İmza alanı işaretle (e-imza için)
  formFields.getSignature('muhendis_imza');

  // Read-only yap (imza sonrası değişmez)
  formFields.flatten({ updateFieldAppearances: true });

  return await pdfDoc.save();
}
```

## 7. UI yapısı

### 7.1 Sayfalar

```
/ek3pilot
├── /                     # Liste — kullanıcının tüm Ek-3'leri
├── /new                  # Yeni form sihirbazı
├── /[id]                 # Form düzenleme
├── /[id]/preview         # PDF önizleme
└── /firma-sablonlari     # Müteahhit/denetim firma şablonları
```

### 7.2 Form sihirbazı (6 adım)

1. **Proje** — Konum + parsel
2. **Yapı** — Teknik özellikler (ETABS varsa otomatik)
3. **İnşaat** — Tarih + maliyet
4. **Sahibi** — TCKN/VKN doğrulama
5. **Müteahhit** — Şablon seç veya yeni
6. **Denetim** — Şablon seç veya yeni

Her adımda otomatik kayıt (`status: 'draft'`).

### 7.3 Komponent listesi

```
apps/web/app/(dashboard)/ek3pilot/
├── _components/
│   ├── Ek3List.tsx
│   ├── Ek3Form/
│   │   ├── ProjeStep.tsx
│   │   ├── YapiStep.tsx
│   │   ├── InsaatStep.tsx
│   │   ├── SahibiStep.tsx
│   │   ├── MuteahhitStep.tsx
│   │   └── DenetimStep.tsx
│   ├── PdfPreview.tsx
│   ├── EtabsImportButton.tsx
│   └── FirmaSablonSelect.tsx
```

## 8. API endpoint'leri

```
POST   /api/ek3              # Yeni form oluştur (status: draft)
GET    /api/ek3              # Listele (org_id filtresi RLS ile)
GET    /api/ek3/:id          # Detay
PATCH  /api/ek3/:id          # Alan güncelle (her step otomatik kayıt)
POST   /api/ek3/:id/generate # PDF üret → status: completed
POST   /api/ek3/:id/revise   # Yeni versiyon oluştur
DELETE /api/ek3/:id          # Soft delete (audit log korunur)

POST   /api/ek3/import-etabs # Bridge'den gelen veri ile dolma
GET    /api/firma-sablonlari # Müteahhit/denetim firma şablonları
POST   /api/firma-sablonlari # Yeni şablon
```

## 9. Doğrulama kuralları

```typescript
// packages/@yapiops/ek3/src/validators.ts

export const ek3Validators = {
  tckn: (value: string): boolean => {
    // TCKN algoritma kontrolü
    if (!/^[1-9]\d{10}$/.test(value)) return false;
    const digits = value.split('').map(Number);
    const sum1 = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7;
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    if ((sum1 - sum2) % 10 !== digits[9]) return false;
    if (digits.slice(0, 10).reduce((a, b) => a + b, 0) % 10 !== digits[10]) return false;
    return true;
  },

  vkn: (value: string): boolean => {
    return /^\d{10}$/.test(value);
    // VKN algoritma kontrolü eklenebilir
  },

  dtsConsistency: (sds: number, dts: number): boolean => {
    // TBDY Tablo 3.2 — DTS Sds eşik kontrolü
    if (dts === 1) return sds >= 0.75;
    if (dts === 2) return sds >= 0.5 && sds < 0.75;
    if (dts === 3) return sds >= 0.33 && sds < 0.5;
    if (dts === 4) return sds < 0.33;
    return false;
  },

  bysConsistency: (yukseklikM: number, dts: number, bys: number): boolean => {
    // TBDY Tablo 3.3 — BYS yükseklik eşik kontrolü
    // (basitleştirilmiş — gerçek implementasyon detaylı olmalı)
    // ...
    return true;
  },
};
```

## 10. Test vakaları (kritik)

Faz 1 lansmanı için minimum test seti:

1. **Geçerli ETABS modeli + tam form** → PDF üretir, alanlar doğru
2. **Eksik zorunlu alan** → uygun hata mesajı, kayıt engellenmez (draft)
3. **Geçersiz TCKN** → checkbox/uyarı, PDF üretmeye izin yok
4. **Tutarsız DTS/Sds** → uyarı (engelleme yok, mühendis sorumluluğu)
5. **Versiyon revize** → eski PDF korunur, yeni v2 oluşur
6. **ETABS metadata import** → kat sayısı, alan, DTS doğru yansır
7. **Multi-seat erişim** → engineer kendi formlarını görür, admin tümünü
8. **PDF AcroForm okuma** → üretilen PDF e-imza yazılımıyla açılır

## 11. Lansman kriterleri (DoD — Definition of Done)

- [ ] 5 design partner ofiste 10+ Ek-3 üretti
- [ ] PDF, gerçek e-imza yazılımıyla (E-İmzaTR) açılıp imzalanabildi
- [ ] PDF, yapı denetim sistemine yüklendi (en az 1 başarılı kayıt)
- [ ] Bridge ile ETABS import en az %80 alan doğru dolduruyor
- [ ] Bug listesi P0/P1 = 0
- [ ] Kullanıcı dokümanı (Türkçe) tamamlandı
- [ ] Marketing landing page canlı, fiyat şeffaf
- [ ] Iyzico abonelik akışı çalışıyor, ilk gerçek ödeme alındı
- [ ] E-fatura ilk kullanıcıya kesildi
- [ ] Audit log ilk 100 işlemde tutarlı
