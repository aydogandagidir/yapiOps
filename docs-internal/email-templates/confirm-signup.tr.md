# Confirm Signup (TR)

## Subject

```
YapıOps hesabınızı doğrulayın
```

## Body (HTML)

```html
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;"
>
  <h2 style="font-size: 20px; margin: 0 0 16px;">YapıOps hesabınızı doğrulayın</h2>

  <p style="line-height: 1.6; margin: 0 0 16px;">
    Merhaba{{ if .Data.full_name }} {{ .Data.full_name }}{{ end }},
  </p>

  <p style="line-height: 1.6; margin: 0 0 16px;">
    {{ if .Data.org_name }}<strong>{{ .Data.org_name }}</strong> için y{{ else }}Y{{ end }}apıOps
    hesabınızı oluşturduğunuz için teşekkürler. 14 günlük ücretsiz deneme süreniz, hesabınızı
    doğruladıktan sonra başlar.
  </p>

  <p style="line-height: 1.6; margin: 0 0 24px;">
    Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:
  </p>

  <p style="margin: 0 0 24px;">
    <a
      href="{{ .ConfirmationURL }}"
      style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;"
    >
      Hesabımı Doğrula
    </a>
  </p>

  <p style="line-height: 1.6; margin: 0 0 16px; color: #555; font-size: 14px;">
    Buton çalışmazsa şu bağlantıyı tarayıcınıza yapıştırın:<br />
    <a href="{{ .ConfirmationURL }}" style="color: #0f172a; word-break: break-all;"
      >{{ .ConfirmationURL }}</a
    >
  </p>

  <p style="line-height: 1.6; margin: 0 0 24px; color: #555; font-size: 14px;">
    Bu bağlantı 1 saat geçerlidir. İşlemi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 8px;">
    <strong>YapıOps</strong> — Türk yapı denetimi için bulut SaaS<br />
    BlueDev | <a href="mailto:info@bluedev.dev" style="color: #6b7280;">info@bluedev.dev</a>
  </p>

  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
    <a href="{{ .SiteURL }}/tr/legal/kvkk" style="color: #6b7280;">KVKK aydınlatma metni</a>
    &nbsp;·&nbsp;
    <a href="{{ .SiteURL }}/tr/settings/notifications" style="color: #6b7280;"
      >İletişim tercihleri</a
    >
  </p>
</div>
```

## Notlar

- `{{ if .Data.full_name }}` koşullu — full_name yoksa selamlama "Merhaba," olur
- `{{ if .Data.org_name }}` — org adı varsa "X için YapıOps hesabınızı..." aksi takdirde "YapıOps hesabınızı..."
- Buton + fallback URL ikisi de var (mail client buton render etmeyebilir)
- Footer'da KVKK + bildirim tercihleri linkleri
