# Claude Code İçin Master Çalıştırma Talimatı

> Bu dosya, Claude Code'un YapıOps Suite'i sıfırdan inşa ederken takip edeceği prosedürü tanımlar.

## Ön koşullar

```bash
# Sistem gereksinimleri
node --version    # >= 20.0.0
pnpm --version    # >= 9.0.0
docker --version  # Local Supabase için
git --version
```

## İlk çalıştırma

Repo klonlanıp `pnpm install` yapıldıktan sonra Claude Code'a verilecek prompt:

```
Aşağıdaki sırayla çalış:

1. docs-internal/CLAUDE.md dosyasını oku — bu master mimari belgesi.
2. docs-internal/modules/ klasöründeki 5 dosyayı oku:
   - ek3pilot.md
   - raporx.md
   - spektrumhub.md
   - copilot.md
   - billing.md
3. Mevcut repo yapısını incele (apps/, packages/ klasörleri).

Sonra Faz 0'dan başla (CLAUDE.md Bölüm 11).

KURALLAR:
- Her dosya oluşturduğunda CLAUDE.md'deki Bölüm 3'teki yapıya birebir uy.
- Her commit öncesi pnpm lint && pnpm type-check çalıştır.
- TBDY hesaplamaları (@yapiops/tbdy paketi) için önce test yaz, sonra implementasyon.
- KVKK ve mühendislik sorumluluğu konularına dikkat (her formda aydınlatma metni).
- Türkçe yorum yaz, kod İngilizce — Türkçe karakter kullan.
- ASLA hayal madde numarası verme (TBDY/TS500 maddesi alıntılarken doğrula).
- Her modül DoD (Definition of Done) kriterlerini bitirmeden bir sonrakine geçme.

İLERLEME RAPORU:
Her faz sonunda bana CLAUDE.md Bölüm 11'deki checklist üzerinden:
- [x] tamamlanan
- [ ] tamamlanmayan
biçiminde rapor ver.

İLK GÖREV:
Faz 0 Hafta 1: Monorepo iskelet zaten kuruldu. Şimdi Supabase migration'ları
uygula, paket package.json dosyalarını oluştur, ESLint/Prettier config'i kur.
```

## Faz başına check

### Faz 0 sonu (Hafta 4)
- [ ] Monorepo dev ortamı çalışır (`pnpm dev`)
- [ ] Local Supabase ayakta, migration uygulanmış
- [ ] Auth akışı (kayıt/giriş) çalışır
- [ ] BillingCore Iyzico sandbox ile abonelik akışı POC
- [ ] Audit log her yazma işleminde tutuluyor
- [ ] Vercel staging deploy başarılı

### Faz 1 sonu (Hafta 12) — Ek3Pilot lansman
- [ ] Ek3Pilot DoD tüm maddeleri ✓ (modules/ek3pilot.md Bölüm 11)
- [ ] BillingCore DoD tüm maddeleri ✓ (modules/billing.md Bölüm 12)
- [ ] İlk gerçek müşteri ödeme yaptı, e-fatura aldı
- [ ] Marketing landing canlı, fiyat şeffaf

### Faz 2 sonu (Hafta 20) — RaporX lansman
- [ ] RaporX DoD tüm maddeleri ✓ (modules/raporx.md Bölüm 11)
- [ ] @yapiops/tbdy paketinde 7 ana kontrol test ediliyor, %0 sapma
- [ ] 10 beta ofisten ≥30 rapor üretildi

### Faz 3 sonu (Hafta 26) — SpektrumHub + Copilot beta
- [ ] SpektrumHub DoD ✓ (modules/spektrumhub.md Bölüm 10)
- [ ] TBDY-Copilot beta DoD ✓ (modules/copilot.md Bölüm 11)
- [ ] AFAD entegrasyonu canlı (veya fallback grid hazır)
- [ ] TBDY/TS500 RAG sistemi çalışıyor, hayal madde tespiti aktif

## Sıkça karşılaşılan hatalar (proaktif önleme)

### 1. ETABS OAPI version compatibility
**Sorun:** ETABS v18, v19, v20, v21 OAPI'si arasında küçük farklar var (örn. yeni metod isimleri).
**Çözüm:** Bridge'de version detection yap, version-specific adapter pattern kullan.

### 2. Türkçe karakter encoding
**Sorun:** PDF üretiminde "ğüşıöç" karakterleri bozuluyor.
**Çözüm:** PDF font olarak Roboto veya Source Sans 3 (Türkçe destekli) embed et.

### 3. Iyzico subscription proration
**Sorun:** Plan upgrade mid-cycle yapılınca prorate hesabı yanlış.
**Çözüm:** Iyzico'nun resmi prorate API'sini kullan, manuel hesap yapma.

### 4. AFAD API rate limiting
**Sorun:** AFAD API rate-limit'li veya çalışmayabilir.
**Çözüm:** Result cache (proje koordinatına göre 1 yıl), fallback: TBDY ekindeki grid verisini önbellekle.

### 5. RLS policy çakışması
**Sorun:** Bir tabloya yazarken RLS reddi alabilirsiniz (özellikle audit log gibi cross-org tablolarda).
**Çözüm:** Server-side mutations'da `service_role` key kullan, never expose to client.

### 6. AI hallucinated TBDY citation
**Sorun:** Copilot olmayan madde numarası uyduruyor.
**Çözüm:** Cevap pipeline'ında validator var: alıntılanan madde numarası RAG sonuçlarında olmalı, yoksa cevap reddedilir.

## Yardım

Belirsiz nokta varsa, spesifik dosya referansıyla sor:
- "raporx.md Bölüm 4.2'de göreli kat ötelemesi formülünde X mi Y mi olmalı?"
- "billing.md Bölüm 4.2'de e-fatura akışı için Foriba mı Logo mu önerirsiniz?"

Asla varsayım üzerine çalışma; mühendislik kodu yazıyoruz, hata maliyeti yüksek.
