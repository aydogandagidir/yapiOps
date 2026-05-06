# Modül: SpektrumHub

> **Lansman:** Faz 3 (Hafta 21–26)
> **Öncelik:** P1
> **Bağımlılık:** AFAD API, BillingCore

## 1. Vaat

Zemin etüd raporu yükle → AFAD spektrumu otomatik çek → ETABS-ready function dosyası üret. 30–60 dakikalık manuel iş → 2 dakika.

## 2. Mevcut acı

Bir mühendis bugün şunu yapıyor:
1. Zemin etüd raporunu okur (PDF, ~30 sayfa)
2. Vs30, zemin sınıfı, koordinat çıkarır (manuel)
3. AFAD Türkiye Deprem Tehlike Haritası web sitesine girer
4. Koordinatı tek tek yazar, deprem yer hareketi düzeyini seçer (DD-1, DD-2, DD-3, DD-4)
5. Çıkan Sds, Sd1, PGA değerlerini Excel'e yazar
6. TBDY tasarım spektrumunu el ile hesaplar (TBDY 2.3.4)
7. ETABS'a Function olarak girer (Period-Sa çiftleri)

**Hata kaynakları:** Yanlış zemin sınıfı, yanlış koordinat, yanlış spektrum hesabı, yanlış birim.

## 3. Çözüm akışı

```
[Zemin raporu PDF yükle]
    ↓
[AI parser: Vs30, sınıf, koordinat çıkar (Claude vision)]
    ↓
[Kullanıcıya doğrulat — "Vs30 = 380 m/s, ZD sınıfı, doğru mu?"]
    ↓
[AFAD API çağrısı: koordinat + sınıf → Sds/Sd1/PGA (4 deprem düzeyi)]
    ↓
[TBDY 2.3.4 ile tasarım spektrumu üret (yatay + düşey)]
    ↓
[Period-Sa tablosu + grafik göster]
    ↓
[Export seçenekleri:]
    - ETABS function .txt
    - SAP2000 function (Faz 2)
    - ideCAD format (Faz 2)
    - PDF özet (rapora ek)
```

## 4. AFAD API entegrasyonu

### 4.1 API kaynağı

AFAD Türkiye Deprem Tehlike Haritası API'si: https://tdth.afad.gov.tr/

**Önemli:** AFAD'ın resmi public REST API'si sınırlı/değişken olabilir. Üç fallback stratejisi:

1. **Birinci tercih:** AFAD resmi API varsa direkt çağrı
2. **İkinci tercih:** AFAD WebGIS servisi reverse engineering (resmi belge yok ama public)
3. **Üçüncü tercih:** Kendi spektral grid hesabı — TBDY ekindeki Türkiye haritası grid verisinin önbelleklenmesi (yıllık güncelleme)

> **Karar:** Faz 3 başında AFAD API'sini canlı test et; çalışmıyorsa veya rate-limit'liyse 3. seçeneği uygulamaya hazırlık. Bu, **araştırma + POC** gerektirir, MVP öncesi belirsizlik kalemi.

### 4.2 İstek/yanıt yapısı

```typescript
// packages/@yapiops/spektrum/src/afad.ts

export interface AfadSpektrumIstek {
  latitude: number;
  longitude: number;
  zeminSinifi: 'ZA' | 'ZB' | 'ZC' | 'ZD' | 'ZE' | 'ZF';
  depremDuzeyi: 'DD-1' | 'DD-2' | 'DD-3' | 'DD-4';
}

export interface AfadSpektrumYanit {
  ss: number;       // Kısa periyot harita spektral ivme katsayısı
  s1: number;       // 1.0 sn periyot harita spektral ivme katsayısı
  pga: number;      // En büyük yer ivmesi
  pgv: number;      // En büyük yer hızı

  // Zemin sınıfı katsayıları
  fs: number;       // Kısa periyot zemin etki katsayısı
  f1: number;       // 1.0 sn periyot zemin etki katsayısı

  // Hesaplanan tasarım spektral ivme katsayıları
  sds: number;      // Sds = Ss * Fs
  sd1: number;      // Sd1 = S1 * F1
}

export async function afadSpektrumCek(
  istek: AfadSpektrumIstek
): Promise<AfadSpektrumYanit> {
  // ...
}
```

## 5. Zemin raporu PDF parser

### 5.1 Yaklaşım

Zemin etüd raporları yapısal olarak farklı (her firma kendi şablonunu kullanıyor). Kural-tabanlı parser işe yaramaz.

**Çözüm:** Claude vision (Opus 4.7 veya Haiku 4.5 multimodal) ile yapısal çıkarım.

### 5.2 Pipeline

```typescript
// packages/@yapiops/spektrum/src/zemin-parser.ts

export interface ZeminRaporVerisi {
  vs30?: number;                      // m/s
  zeminSinifi?: 'ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF';
  koordinat?: { lat: number; lng: number };
  sondajDerinlikleri?: number[];
  spt?: { derinlik: number; n: number }[];
  yeralti_su_seviyesi?: number;
  taban_basinci_kapasitesi_kPa?: number;
  rapor_tarihi?: string;
  rapor_no?: string;
  duzenleyen_firma?: string;
  duzenleyen_jeolog?: string;
  guvenSeviyesi: 'yuksek' | 'orta' | 'dusuk';  // AI'nın güveni
  tespitNotlari: string[];           // AI'nın çıkarım gerekçesi
}

export async function parseZeminRaporu(
  pdfBuffer: Buffer
): Promise<ZeminRaporVerisi> {
  // PDF'i ilk 3 sayfa görüntüye çevir (özet + sonuç bölümleri)
  const images = await pdfToImages(pdfBuffer, { pages: [1, 2, 3, -1, -2] });

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',  // Vision yeterli
    max_tokens: 2000,
    system: ZEMIN_PARSER_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        ...images.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: img }
        })),
        {
          type: 'text',
          text: `Bu zemin etüd raporundan aşağıdaki bilgileri JSON olarak çıkar.
                 Bulamadıklarını null bırak. Çıkarım gerekçesini "tespitNotlari"
                 içine yaz.`
        }
      ]
    }]
  });

  return JSON.parse(extractJson(response.content[0].text));
}
```

### 5.3 Doğrulama akışı

AI çıkarımı **asla doğrudan kullanılmaz** — kullanıcı her zaman onaylar:

```
[AI çıkarım sonucu: "Vs30 = 380 m/s, sınıf ZD"]
    ↓
[UI: Form alanları doldurulmuş, "Doğrula veya düzelt" CTA]
    ↓
[Mühendis kontrol eder, gerekirse düzeltir]
    ↓
[Onay → AFAD çağrısı yapılır]
```

## 6. Tasarım spektrumu hesabı (TBDY 2.3.4)

```typescript
// packages/@yapiops/spektrum/src/tbdy-spektrum.ts

export function tasarimSpektrumu(params: {
  sds: number;
  sd1: number;
  zeminSinifi: ZeminSinifi;
  periyotAdimi?: number;   // default 0.01 sn
  maxPeriyot?: number;     // default 6 sn
}): SpektrumNoktasi[] {
  const { sds, sd1 } = params;
  const TA = 0.2 * sd1 / sds;       // TBDY Eq. 2.5
  const TB = sd1 / sds;              // TBDY Eq. 2.6
  const TL = 6.0;                    // TBDY tablo

  const adim = params.periyotAdimi ?? 0.01;
  const noktalar: SpektrumNoktasi[] = [];

  for (let T = 0; T <= (params.maxPeriyot ?? 6); T += adim) {
    let sa: number;
    if (T < TA) {
      sa = (0.4 + 0.6 * T / TA) * sds;       // TBDY Eq. 2.1
    } else if (T < TB) {
      sa = sds;                                // TBDY Eq. 2.2
    } else if (T <= TL) {
      sa = sd1 / T;                            // TBDY Eq. 2.3
    } else {
      sa = sd1 * TL / (T * T);                // TBDY Eq. 2.4
    }
    noktalar.push({ T: Number(T.toFixed(3)), sa: Number(sa.toFixed(4)) });
  }

  return noktalar;
}
```

## 7. ETABS function dosyası export

ETABS Response Spectrum function formatı:

```
File: TBDY2018_Tasarim_Spektrumu.txt
Format: Period vs. Spectral Acceleration
Damping: 0.05

0.000  0.4000
0.010  0.4150
0.020  0.4300
...
6.000  0.0167
```

Direkt ETABS'a `Define → Functions → Response Spectrum → From File` ile import edilebilir.

**Bonus:** Bridge'den çağrı ile ETABS modeline OAPI üzerinden direkt yazılabilir:
```csharp
SapModel.Func.FuncRS.SetUser("TBDY2018", periodArray, saArray);
```

## 8. UI yapısı

```
apps/web/app/(dashboard)/spektrumhub/
├── page.tsx                # Geçmiş analizler listesi
├── new/
│   ├── page.tsx            # Yeni analiz sihirbazı (3 adım)
│   └── _steps/
│       ├── ZeminStep.tsx   # PDF upload + manuel
│       ├── KoordinatStep.tsx # Harita + AFAD çağrısı
│       └── SpektrumStep.tsx  # Sonuç + export
└── [id]/
    └── page.tsx            # Analiz detay
```

## 9. API endpoint'leri

```
POST   /api/spektrum/zemin-parse      # PDF → çıkarım
POST   /api/spektrum/afad             # Koordinat + sınıf → spektrum
POST   /api/spektrum/tasarim          # Sds/Sd1 → tasarım spektrumu (Period-Sa)
POST   /api/spektrum/save             # Analizi kaydet
GET    /api/spektrum                  # Listele
GET    /api/spektrum/:id              # Detay
GET    /api/spektrum/:id/etabs.txt    # ETABS function dosyası indir
GET    /api/spektrum/:id/sap2000.txt  # SAP2000 (Faz 2)
```

## 10. Lansman kriterleri (DoD)

- [ ] AFAD entegrasyonu çalışıyor (veya fallback grid hazır)
- [ ] 5 farklı firmanın zemin raporundan ≥%80 doğrulukla parse
- [ ] TBDY 2.3.4 spektrum hesabı el hesabıyla %0 sapma (3 referans vaka)
- [ ] ETABS function dosyası gerçek bir modele başarıyla import edildi
- [ ] 3 mühendis "manuel akıştan en az 30 dakika tasarruf ediyorum" dedi
- [ ] Standalone fiyatlandırma (₺250/proje) ile satın alınabiliyor
