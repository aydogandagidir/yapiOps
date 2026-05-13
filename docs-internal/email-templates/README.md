# Supabase Auth Email Template'leri (TR)

YapıOps Türkiye yapı denetim sektörüne hizmet veriyor. Supabase Auth'un
varsayılan email template'leri İngilizce; bu klasörde her template'in TR
karşılığı bulunur. Custom SMTP olarak Resend → `noreply@bluedev.dev`
kullanıldığı için mail kullanıcı domain'inden çıkar.

## Kurulum

1. Supabase Dashboard → **Authentication → Email Templates** sayfasını aç:
   https://supabase.com/dashboard/project/ykdeuwrtdxufmmrtqfex/auth/templates

2. Her template için (Confirm signup / Reset password / Magic link /
   Change email):
   - Burdaki `.tr.md` dosyasını aç
   - **Subject** kısmındaki tek satırı Subject heading kutusuna yapıştır
   - **Body** kısmındaki HTML'i Message body kutusuna yapıştır
   - Save

3. Custom SMTP zaten Resend ile yapılandırılmış → test için kendi mail
   adresinizden signup deneyin, `noreply@bluedev.dev`'den gelmeli.

## Supabase template değişkenleri

| Değişken | Açıklama |
|---|---|
| `{{ .ConfirmationURL }}` | Kullanıcının tıklayacağı eylem linki (signup confirm, password reset, vs.) |
| `{{ .Token }}` | OTP kodu (link tıklanamazsa fallback) |
| `{{ .SiteURL }}` | URL Configuration → Site URL değeri (`https://yapiops.bluedev.dev`) |
| `{{ .Email }}` | Hedef kullanıcının e-posta adresi |
| `{{ .RedirectTo }}` | Confirm sonrası yönlendirilecek path |
| `{{ .Data.full_name }}` | signup user_metadata.full_name |
| `{{ .Data.org_name }}` | signup user_metadata.org_name |

## Stil / tasarım

Tüm template'ler mail-client uyumluluğu için **inline style** + sade
typography kullanır. Tablo bazlı layout yok (Gmail/Outlook'ta sorunsuz
render). Footer'da KVKK link + iletişim adresi sabit.

## Update workflow

Bu klasörde değişiklik → Supabase Dashboard'a manuel kopyalama. Otomatik
sync yok (Supabase Management API ile yapılabilir ama scope dışı).
