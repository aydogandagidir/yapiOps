# YapıOps Desktop Bridge

> **Status:** Faz 1, Hafta 8–9'da implementasyon başlıyor. **Cloud-side hazırlık tamamlandı**; .NET 8 WPF tarafı yakında.

## Amaç

İnce Windows istemcisi (~50–80 MB) — ETABS modellerini OAPI üzerinden okur ve yapı metadata'sını YapıOps cloud'una iletir. Mimari motivasyon: [`docs-internal/CLAUDE.md`](../../docs-internal/CLAUDE.md) §4.4 + [`docs-internal/adr/0001-hibrit-mimari.md`](../../docs-internal/adr/0001-hibrit-mimari.md).

## Hedef yığın

| Katman | Seçim |
|---|---|
| Framework | .NET 8 + WPF |
| ETABS API | ETABSv1.dll (OAPI v21+) — COM/.NET interop |
| Auth | OAuth 2.0 PKCE — browser login, token Windows Credential Manager'da |
| HTTP | `HttpClient` + Polly retry |
| Update | Squirrel.Windows |
| Installer | WiX Toolset (MSI) |
| Crash reporting | Sentry .NET SDK |

## Cloud-side hazırlık (✅ tamamlandı)

Bu commit serisi **Bridge'in HENÜZ var olmadığı** durumda bile çalışan cloud kontrat'larını koymuştur:

| Kontrat | Yer |
|---|---|
| `POST /api/ek3/import-etabs` | [apps/web/src/app/api/ek3/import-etabs/route.ts](../web/src/app/api/ek3/import-etabs/route.ts) — `Ek3EtabsImportSchema` ile validate; `mapEtabsToYapi()` ile yapı bloğunu doldurur |
| `Ek3EtabsImportSchema` | [packages/@yapiops/ek3/src/schema.ts](../../packages/@yapiops/ek3/src/schema.ts) — Bridge'in göndereceği JSON formatı |
| `mapEtabsToYapi()` | [packages/@yapiops/ek3/src/etabs-mapping.ts](../../packages/@yapiops/ek3/src/etabs-mapping.ts) — ETABS metadata → form alan mapping |
| Bridge login UI | [apps/web/src/app/[locale]/auth/desktop-bridge/page.tsx](../web/src/app/%5Blocale%5D/auth/desktop-bridge/page.tsx) — kullanıcıyı authenticate edip Bridge'in localhost listener'ına token aktarır |
| Bridge token refresh | [apps/web/src/app/api/auth/desktop-bridge/refresh/route.ts](../web/src/app/api/auth/desktop-bridge/refresh/route.ts) — refresh_token swap; Supabase service-role |

## OAuth akışı

```
Bridge (.NET WPF)              Browser                    YapıOps Cloud
─────────────────              ───────                    ─────────────
1. PKCE state üret
2. localhost:53682
   HttpListener başlat
3. browser.open  ────────────► /tr/auth/desktop-bridge
                               ?redirect_uri=http://localhost:53682/callback
                               &state=<state>

                                                          4. session yok →
                                                             /tr/login?return=...
                                                          5. session var →
                                                             "Bağlan" UI
                               ◄────────────────────────  6. supabase.auth.getSession()
                                                             access_token + refresh_token
                               7. window.location =
                                  redirect_uri +
                                  #access_token=…
                                  &refresh_token=…
                                  &expires_in=…
                                  &state=<state>

8. listener fragment'ı parse
   eder, state'i doğrular
9. tokenları Windows
   Credential Manager'a yazar

10. periyodik refresh:                                    11. service-role
    POST /api/auth/                                          auth.refreshSession()
    desktop-bridge/refresh ─────────────────────────────────► token rotation
                            ◄──────────────────────────────  yeni access + refresh
```

### Güvenlik notları
- **URL fragment** (`#`) HTTP sunucusuna gitmez — token'lar yalnızca tarayıcıda kalır.
- **State** parametresi Bridge tarafında üretilir, cloud yansıtır, Bridge eşleştirir → CSRF koruması.
- **Loopback redirect_uri** allowlist'i: sadece `http://localhost:53682/...` veya `yapiops-bridge://...` (custom protokol fallback).
- **Refresh endpoint** kullanıcı oturumu (cookie) gerektirmez — refresh_token'ın kendi geçerliliği yetkilendirme aracıdır.

## Faz 1 Hafta 8–9 .NET tarafı

Implementasyon planı: [`~/.claude/plans/faz-1-hafta-8-9-bridge-poc.md`](../../) (yerel olarak Claude oturumlarında erişilir).

Yüksek seviye:
1. `apps/desktop-bridge/src/YapiOps.Bridge/` — ana WPF uygulaması
2. `YapiOps.Bridge.Etabs/` — OAPI wrapper (story/section/spectrum reader)
3. `YapiOps.Bridge.Auth/` — PKCE flow + Windows Credential Manager
4. `YapiOps.Bridge.Sync/` — `ApiClient` + `Ek3EtabsImportSchema`'yı serialize eden GZIP JSON
5. `installer/` — WiX MSI

## Geliştirici kurulum (.NET tarafı geldiğinde)

```powershell
# Visual Studio 2022 + .NET 8 SDK + WiX 4 + Inno Setup gereklidir
cd apps\desktop-bridge
dotnet restore
dotnet build
# ETABS test için:
# - ETABS v21+ kurulu olmalı (lisanslı)
# - Örnek model: samples/etabs/3-katli-konut.edb
```

Cloud tarafıyla entegrasyon test'i için `.env`'e:
```
YAPIOPS_CLOUD_BASE_URL=https://staging.yapiops.com
YAPIOPS_OAUTH_CALLBACK_PORT=53682
```
