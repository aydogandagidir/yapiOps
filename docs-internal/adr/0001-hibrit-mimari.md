# ADR-001: Hibrit Mimari (Masaüstü Bridge + Cloud Backend)

**Durum:** Kabul edildi
**Tarih:** 2026-05-06
**Karar verici:** Bluedev

## Bağlam

YapıOps Suite'in temel modüllerinden RaporX, ETABS modelinden veri okuyup TBDY 2018 raporu üretir. Etex (rakip) bu işi tam masaüstü olarak yapıyor. Pazara nasıl çıkacağımızı belirlemeliyiz.

## Karar

**Hibrit mimari:** Masaüstü "ince istemci" (~50–80 MB .NET 8 + WPF) + Cloud backend (Next.js + Supabase).

- ETABS köprüsü lokal, OAPI ile model okur, JSON metadata ve sonuçları cloud'a gönderir
- Tüm hesaplama, depolama, raporlama, AI ve billing cloud'da
- Ek3Pilot, SpektrumHub, TBDY-Copilot tamamen cloud (tarayıcıdan çalışır, ETABS gerekmez)

## Neden tam cloud değil?

1. **ETABS COM/.NET sadece Windows + lokal makinede çalışır.** OAPI cloud'da host edilemez.
2. **.EDB dosyaları büyük (50–500 MB).** Her seferinde upload kullanıcı deneyimini bozar.
3. **CSI lisans ihlali riski.** Cloud'da ETABS lisansı host etmek lisans şartlarına aykırı, ekonomik olarak savunulamaz.

## Neden tam masaüstü değil (Etex modeli)?

1. **Self-serve abonelik zor.** Etex'te yok — DM ile manuel sözleşme.
2. **Multi-seat collaboration imkansız.** Cloud'suz audit log, paylaşım, denetim akışı yapılamaz.
3. **AI entegrasyonu zayıf.** Lokal makine LLM API'lerine bağlanır ama state cloud'da olmadığı için bağlam kayboluyor.
4. **Güncelleme dağıtımı zor.** Her güncelleme için kurulum.
5. **Cross-device erişim yok.** Telefon/tablet'ten rapor görmek imkansız.
6. **Ek-3 ve SpektrumHub gibi modüller ETABS'a bağlı değil — masaüstü gereksiz sürtünme yaratır.**

## Hibrit'in avantajları

| Konu                | Hibrit               | Tam masaüstü (Etex)  | Tam cloud |
| ------------------- | -------------------- | -------------------- | --------- |
| ETABS entegrasyonu  | ✓                    | ✓                    | ✗         |
| Self-serve abonelik | ✓                    | ✗                    | ✓         |
| Multi-seat          | ✓                    | ✗                    | ✓         |
| AI bağlamı          | ✓                    | Kısmen               | ✓         |
| Cross-device        | Kısmen (cloud kısmı) | ✗                    | ✓         |
| Güncelleme          | Otomatik             | Manuel               | Otomatik  |
| Lisans denetimi     | Cloud                | Lokal lisans dosyası | Cloud     |
| Audit log           | ✓                    | ✗                    | ✓         |

## Sonuçlar

### Olumlu

- Etex'in "tek-modül masaüstü" konumuna karşı yapısal fark
- Ek3Pilot ve SpektrumHub ETABS gerekmediği için daha geniş kullanıcı tabanı (mühendislik öğrencileri, sahibi, yapı denetim firmaları)
- BillingCore modülü direkt cloud'da, e-fatura otomatik

### Olumsuz

- İki ayrı kod tabanı bakım maliyeti (Bluedev tek kişi → risk)
- Bridge'in version drift'i (ETABS v21 → v22 gibi geçişler)
- Network latency (bridge → cloud) kullanıcı deneyimini etkileyebilir

### Azaltım

- Bridge minimum kod: sadece ETABS okuma + cloud'a iletim. Tüm "akıllı" iş cloud'da.
- ETABS adapter pattern ile çoklu version desteği
- Bridge offline mode: network yoksa son sonuçları lokal cache'den göster, online olunca senkron

## Alternatifler reddedildi

### A1: Tam masaüstü (Etex modeli)

Reddedildi — yukarıdaki "neden tam masaüstü değil" gerekçesiyle.

### A2: Tam cloud (kullanıcı .EDB upload eder)

Reddedildi — büyük dosya boyutu, yavaş yükleme, mühendis akışını bozar.

### A3: Web-only ETABS API gateway (cloud'da ETABS host)

Reddedildi — CSI lisans ihlali, maliyet bombası, hukuki risk.

### A4: Browser eklentisi (Chrome extension ETABS'a bağlanır)

Reddedildi — Chrome COM API'lerine erişemez, mimari uygunsuz.

## Referanslar

- [CLAUDE.md Bölüm 2.1](../CLAUDE.md) — Yüksek seviye topoloji
- [modules/raporx.md Bölüm 5](../modules/raporx.md) — Bridge → cloud sync detayı
- ETABS OAPI Documentation v21
