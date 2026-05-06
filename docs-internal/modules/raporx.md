# Modül: RaporX

> **Lansman:** Faz 2 (Hafta 13–20)
> **Öncelik:** P0
> **Bağımlılık:** Desktop Bridge, BillingCore, Auth, `@yapiops/tbdy`

## 1. Vaat

ETABS modelinden TBDY 2018 hesap raporunu cloud'da üret. HTML interaktif + PDF çıktı. AI destekli yorum (TBDY-Copilot ile).

## 2. Etex paritesi (must-have)

Demir'in YouTube oynatma listesinde kanıtlanan kontroller — bunların hepsi MVP'de olmalı:

1. **Perde eksenel kapasite kontrolü** (TBDY 7.6.6)
2. **Perde kesme kontrolü ve donatılandırma** (TBDY 7.6.7)
3. **Perde devrilme momenti kontrolü**
4. **İkinci mertebe etkileri** (TS 500 Madde 4.9.2)
5. **Göreli kat ötelemesi kontrolü** (TBDY Tablo 4.34a/b)
6. **Kolon kontrolü** (TBDY Bölüm 7.3)
7. **Döşeme iç kuvvet ve deplasman raporlama**

## 3. Etex'te olmayan farklılaştırıcılar

Bu özellikler **kategorik fark** yaratır:

### 3.1 HTML interaktif rapor
- Three.js 3D viewer ile tüm modeli gez
- Eleman tıklanınca detay paneli açılır
- Filtreler: kat, eleman tipi, ihlal durumu
- Kat-kat gezinme (ötleme grafikleri her kat için)
- Paylaşılabilir link (organizasyon içi, opsiyonel public)

### 3.2 Multi-user collaboration
- Rapor üzerinde yorum (eleman bazlı)
- Mention (`@meslektaş`) ile bildirim
- Denetimci modu: yorumlama yetkisi var, değiştirme yok
- Onay akışı: mühendis → kontrol mühendisi → denetimci

### 3.3 Versiyon karşılaştırma
- Aynı projenin 2 versiyonu yan yana
- Hangi elemanın hangi parametresi değişti
- Hangi kontrol pass'ten fail'e döndü (regression detection)

### 3.4 Cloud arşiv
- Tüm raporlar 5 yıl saklanır (yapı denetim audit gerekliliği)
- Arama: tarih, proje, mühendis, durum
- Toplu export (KVKK veri taşınabilirliği için)

### 3.5 Hata/uyarı yorumlayıcı (Copilot ile)
Her ihlalde:
- İlgili TBDY/TS500 maddesi linklenir
- Neden ihlal edildiği projeye özel açıklanır
- Düzeltme önerisi (örn: "Perde kalınlığını 30 cm'den 35 cm'ye çıkarın")

### 3.6 Şablon hafızası
- İlk rapordan sonra mühendisin tercihleri öğrenilir:
  - Birim sistemi (kN-m vs ton-m vs kgf-cm)
  - Ondalık hassasiyet
  - Renk kodlaması
  - Logo, firma bilgisi
- Sonraki raporlar otomatik aynı formatta

## 4. TBDY hesaplama kütüphanesi

`packages/@yapiops/tbdy` — bağımsız test edilebilir, framework-agnostic.

### 4.1 Yapı

```
packages/@yapiops/tbdy/
├── src/
│   ├── perde/
│   │   ├── eksenel-kapasite.ts       # TBDY 7.6.6
│   │   ├── kesme-kontrolu.ts          # TBDY 7.6.7
│   │   ├── devrilme-moment.ts
│   │   └── donatilandirma.ts
│   ├── kolon/
│   │   ├── eksenel-egilme.ts          # TBDY 7.3
│   │   ├── kesme.ts
│   │   └── kapasite-orani.ts
│   ├── doseme/
│   │   ├── ic-kuvvetler.ts
│   │   └── deplasman.ts
│   ├── oteleme/
│   │   └── goreli-kat-otelemesi.ts    # TBDY 4.9.1.3
│   ├── ikinci-mertebe/
│   │   └── theta-katsayisi.ts         # TS 500 4.9.2
│   ├── spektrum/
│   │   ├── tasarim-spektrumu.ts       # TBDY 2.3.4
│   │   └── azaltilmis-spektrum.ts     # TBDY 2.3.7
│   ├── common/
│   │   ├── birimler.ts
│   │   ├── malzeme.ts                 # TS 500 beton/donatı
│   │   └── tipler.ts
│   └── index.ts
└── tests/
    ├── perde/
    ├── kolon/
    ├── ...
    └── reference-projects/             # El hesabı doğrulanmış vakalar
```

### 4.2 Örnek implementasyon

```typescript
// packages/@yapiops/tbdy/src/oteleme/goreli-kat-otelemesi.ts

import { ElemanDeplasmani, KatBilgisi, BetonarmeMalzeme, KullanimSinifi } from '../common/tipler';

/**
 * TBDY 2018 — Göreli kat ötelemesi kontrolü
 * Madde 4.9.1.3, Tablo 4.34a/b
 */

export interface OtelemeSonucu {
  katNo: number;
  katYuksekligi: number;        // hi (m)
  delta_i: number;               // Kat ötelemesi (mm)
  lambda_i: number;              // Etkin göreli kat ötelemesi
  lambda_max: number;            // Sınır (Tablo 4.34a/b)
  oran: number;                  // lambda_i / lambda_max
  durum: 'GECER' | 'GECMEZ';
  yontem: '4.34a' | '4.34b';     // Hangi tablo kullanıldı
}

export function goreliKatOtelemesi(params: {
  katlar: KatBilgisi[];
  deplasmanlar: ElemanDeplasmani[];
  R: number;                     // Taşıyıcı sistem davranış katsayısı
  I: number;                     // Bina önem katsayısı
  malzeme: BetonarmeMalzeme;
  kullanim: KullanimSinifi;
  gevrekDolguDuvar: boolean;     // Tablo seçimini etkiler
}): OtelemeSonucu[] {
  const sonuclar: OtelemeSonucu[] = [];

  for (const kat of params.katlar) {
    // Kat tepe ve taban deplasmanlarını bul
    const tepe = params.deplasmanlar.find(d => d.elevation === kat.zUst);
    const taban = params.deplasmanlar.find(d => d.elevation === kat.zAlt);
    if (!tepe || !taban) continue;

    const delta_i = (tepe.dx - taban.dx);  // mm
    const hi = kat.yukseklikM * 1000;       // mm

    // TBDY 4.9.1.3 — etkin göreli kat ötelemesi
    const lambda_i = (delta_i / hi) * (params.R / params.I);

    // TBDY Tablo 4.34a vs 4.34b seçimi
    const yontem = params.gevrekDolguDuvar ? '4.34a' : '4.34b';
    const lambda_max = yontem === '4.34a' ? 0.008 : 0.016;

    sonuclar.push({
      katNo: kat.no,
      katYuksekligi: kat.yukseklikM,
      delta_i,
      lambda_i,
      lambda_max,
      oran: lambda_i / lambda_max,
      durum: lambda_i <= lambda_max ? 'GECER' : 'GECMEZ',
      yontem
    });
  }

  return sonuclar;
}
```

### 4.3 Test stratejisi

**Kritik:** Her hesaplama fonksiyonunun **el hesabı doğrulanmış** test vakası olmalı. Bu yazılımın güvenilirliğinin temelidir.

```typescript
// tests/oteleme/goreli-kat-otelemesi.test.ts

describe('Göreli kat ötelemesi — TBDY 2018', () => {
  it('Referans proje 1: 8 katlı betonarme, R=8, I=1', () => {
    // El hesabı: kat 3'te delta=15mm, h=3m, lambda=0.005
    // Sınır 0.008 (gevrek dolgu yok)
    const result = goreliKatOtelemesi(/* ... */);
    expect(result[2].lambda_i).toBeCloseTo(0.005, 4);
    expect(result[2].durum).toBe('GECER');
  });

  it('TBDY Madde 4.9.1.3 — gevrek dolgu duvarlı bina', () => {
    // ...
  });
});
```

## 5. ETABS veri akışı

### 5.1 Bridge'in topladığı veri

```typescript
// packages/@yapiops/etabs/src/types.ts

export interface EtabsModelData {
  metadata: {
    fileName: string;
    etabsVersion: string;       // "21.2.0" gibi
    units: 'kN-m' | 'kN-mm' | 'ton-m' | 'kgf-cm';
    extractedAt: string;
  };

  general: {
    storyCount: number;
    totalHeight: number;
    totalAreaM2: number;
    structuralSystem: 'BAC' | 'BAP' | 'BAC-BAP' | 'CELIK' | 'KARMA';
  };

  stories: Array<{
    no: number;
    name: string;
    elevation: number;
    height: number;
  }>;

  materials: Material[];
  sections: Section[];

  elements: {
    columns: Column[];
    beams: Beam[];
    walls: Wall[];
    slabs: Slab[];
  };

  loadCases: LoadCase[];
  loadCombos: LoadCombo[];

  results: {
    displacements: Displacement[];   // Her load combo için
    storyForces: StoryForce[];
    elementForces: ElementForce[];
    modal: ModalResult[];
  };

  spectrum: {
    sds: number;
    sd1: number;
    rDirX: number;
    rDirY: number;
    importanceFactor: number;
  };
}
```

### 5.2 Bridge → cloud sync

```
[ETABS açık]
    ↓
[Bridge "Export to RaporX" tıklanır]
    ↓
[OAPI çağrıları — yaklaşık 30–60 saniye orta model için]
    ↓
[JSON olarak serialize, gzip, ~2–10 MB]
    ↓
[POST /api/etabs/upload, multipart/form-data]
    ↓
[Cloud: Storage'a yaz, etabs_models tablosu kayıt]
    ↓
[Web UI'da otomatik açılır, "Rapor üret" butonu aktif]
```

## 6. Rapor üretim akışı

```
[Kullanıcı "Rapor üret" tıklar, kontrol seçer]
    ↓
[POST /api/reports → Inngest job kuyruğa atılır]
    ↓
[Job: @yapiops/tbdy ile hesaplamalar (5–30 sn)]
    ↓
[Sonuç DB'ye yazılır, status: 'ready']
    ↓
[Eğer office+ai plan: Copilot service çağrılır → AI özet]
    ↓
[HTML rapor render → Storage]
    ↓
[Realtime channel ile UI'ya bildirim → kullanıcı raporu görür]
    ↓
[Kullanıcı "PDF indir" → Puppeteer ile HTML→PDF, ~10 sn]
```

## 7. UI yapısı

```
apps/web/app/(dashboard)/raporx/
├── page.tsx                    # Tüm raporlar listesi
├── [id]/
│   ├── page.tsx                # HTML rapor görüntüleyici
│   ├── compare/[other]/        # Versiyon karşılaştırma
│   └── export/                 # PDF/Word export
├── new/
│   └── page.tsx                # ETABS dosyası seç + kontrol seç
└── _components/
    ├── ReportViewer.tsx
    ├── Model3DViewer.tsx       # Three.js
    ├── StoryDriftChart.tsx     # Recharts
    ├── ElementDetailPanel.tsx
    ├── CommentSystem.tsx
    └── AICopilotPanel.tsx
```

## 8. PDF rapor şablonu

Resmi yapı denetim formatına yakın, ofis logolu, mühendis imza alanlı.

**Bölümler:**
1. Kapak (proje bilgisi, mühendis, tarih)
2. Yönetici özeti (1 sayfa, AI ile üretilen)
3. Genel bilgiler (ETABS modeli özeti, yük durumları)
4. Spektrum analizi
5. Kat ötelemesi kontrolü (her kat tablo + grafik)
6. İkinci mertebe etkileri
7. Perde kontrolleri (her perde için ayrı tablo)
8. Kolon kontrolleri (kapasite oranı tablosu)
9. Döşeme iç kuvvetler
10. Sonuç ve öneriler (AI ile)
11. Mühendis imza ve oda bilgisi

## 9. API endpoint'leri

```
POST   /api/etabs/upload              # Bridge'den ETABS verisi yükle
GET    /api/etabs/models              # Modelleri listele
GET    /api/etabs/models/:id          # Detay

POST   /api/reports                   # Yeni rapor başlat (kuyruğa at)
GET    /api/reports                   # Listele
GET    /api/reports/:id               # Detay (sonuçlar)
GET    /api/reports/:id/html          # Interactive HTML
POST   /api/reports/:id/pdf           # PDF üret
POST   /api/reports/:id/comments      # Yorum ekle
POST   /api/reports/:id/compare/:other # Karşılaştırma raporu
```

## 10. Performans hedefleri

| İşlem | Hedef | Maks |
|---|---|---|
| ETABS bridge export (orta model, ~500 eleman) | 30 sn | 90 sn |
| Cloud upload | 5 sn | 30 sn |
| TBDY hesaplama | 10 sn | 60 sn |
| AI özet | 5 sn (cache hit) | 20 sn |
| HTML render | 3 sn | 10 sn |
| PDF render | 10 sn | 30 sn |
| **Toplam (kullanıcının "rapor üret" → "PDF elinde")** | **<2 dk** | **<5 dk** |

## 11. Lansman kriterleri (DoD)

- [ ] 7 TBDY kontrolünün hepsi çalışıyor ve test ediliyor
- [ ] El hesabıyla ≥10 referans proje doğrulandı, %0 sapma
- [ ] 10 beta ofisten ≥30 rapor üretildi
- [ ] Bağımsız bir mühendis (Bluedev dışı) HTML raporu inceleyip "anlaşılır" onayı verdi
- [ ] Versiyon karşılaştırma çalışıyor
- [ ] PDF rapor 3 farklı ofis logosuyla test edildi
- [ ] AI özet özelliği "office+ai" planda kullanılabilir
- [ ] Etex'i kullanmış bir mühendis "Bluedev daha iyi" demek için en az 3 somut sebep söyledi
