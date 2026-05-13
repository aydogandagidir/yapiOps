# Change Email (TR)

## Subject

```
YapıOps e-posta değişikliği onayı
```

## Body (HTML)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">

  <h2 style="font-size: 20px; margin: 0 0 16px;">E-posta değişikliğinizi onaylayın</h2>

  <p style="line-height: 1.6; margin: 0 0 16px;">
    Merhaba,
  </p>

  <p style="line-height: 1.6; margin: 0 0 24px;">
    YapıOps hesabınızda e-posta adresinizin değişmesi talep edildi. Yeni adres: <strong>{{ .NewEmail }}</strong>
  </p>

  <p style="line-height: 1.6; margin: 0 0 24px;">
    Değişikliği onaylamak için aşağıdaki butona tıklayın:
  </p>

  <p style="margin: 0 0 24px;">
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Değişikliği Onayla
    </a>
  </p>

  <p style="line-height: 1.6; margin: 0 0 16px; color: #555; font-size: 14px;">
    Buton çalışmazsa şu bağlantıyı tarayıcınıza yapıştırın:<br>
    <a href="{{ .ConfirmationURL }}" style="color: #0f172a; word-break: break-all;">{{ .ConfirmationURL }}</a>
  </p>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="line-height: 1.5; margin: 0; font-size: 14px; color: #78350f;">
      <strong>Güvenlik notu:</strong> Bu değişikliği siz talep etmediyseniz bu e-postayı yok sayın ve şifrenizi hemen değiştirin.
    </p>
  </div>

  <p style="line-height: 1.6; margin: 16px 0 0; color: #555; font-size: 14px;">
    Bu bağlantı 1 saat geçerlidir.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;">

  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 8px;">
    <strong>YapıOps</strong> — Türk yapı denetimi için bulut SaaS<br>
    BlueDev | <a href="mailto:info@bluedev.dev" style="color: #6b7280;">info@bluedev.dev</a>
  </p>

  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
    <a href="{{ .SiteURL }}/tr/legal/kvkk" style="color: #6b7280;">KVKK aydınlatma metni</a>
  </p>

</div>
```

## Notlar

- `{{ .NewEmail }}` Supabase'in change-email akışındaki yeni adres değişkeni
- Phishing dirençli sarı uyarı kutusu — değişikliği başlatmayan kullanıcı için güvenlik
