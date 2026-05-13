import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const metadata = {
  title: 'KVKK Aydınlatma Metni — YapıOps',
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında YapıOps'un veri işleme uygulamaları.",
};

// Manuel Tailwind class'larla şekillendirildi — @tailwindcss/typography
// kurulu değil, prose plugin'i package.json'da yok. Yeni dependency
// eklemek yerine inline class'lar tercih edildi (KVKK sayfası tek seferlik
// içerik, prose marketingvalue az).
const H1 = 'mb-2 text-2xl font-bold';
const H2 = 'mt-8 mb-2 text-lg font-semibold';
const P = 'my-3 text-sm leading-relaxed';
const UL = 'my-3 list-disc space-y-1 pl-6 text-sm';
const OL = 'my-3 list-decimal space-y-1 pl-6 text-sm';
const TABLE_WRAP = 'my-4 overflow-x-auto';
const TABLE = 'w-full border-collapse text-sm';
const TH = 'border-b px-3 py-2 text-left font-semibold';
const TD = 'border-b px-3 py-2';

/**
 * KVKK aydınlatma metni (Türkiye'ye özel yasal zorunluluk).
 *
 * İçerik bilinçli olarak hardcoded TR — KVKK metni Türkçe yasal metindir.
 * Tam i18n key bazlı çeviri over-engineering; sayfa nadiren güncellenir.
 *
 * Hukuki review: deploy öncesi metin BlueDev hukuk danışmanı tarafından
 * gözden geçirilmelidir. Mevcut metin KVKK Mad. 10 + Mad. 11 baseline
 * şablonundan + yapı denetim sektörü (4708 sayılı kanun) ek
 * yükümlülüklerinden derlenmiştir.
 */
export default async function KvkkPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'en') {
    return (
      <article>
        <h1 className={H1}>Privacy Notice (KVKK)</h1>
        <p className={P}>
          KVKK is the Turkish Personal Data Protection Law (Law No. 6698)
          governing how YapıOps processes personal data of users in Türkiye.
          The full, legally binding text of this notice is published in
          Turkish.
        </p>
        <p className={P}>
          <Link href="/legal/kvkk" locale="tr" className="font-medium underline">
            Read the Turkish version →
          </Link>
        </p>
        <p className="my-3 text-xs text-muted-foreground">
          For data subject requests under KVKK Article 11, contact:{' '}
          <a href="mailto:info@bluedev.dev" className="underline">
            info@bluedev.dev
          </a>
        </p>
      </article>
    );
  }

  return (
    <article>
      <h1 className={H1}>KVKK Aydınlatma Metni</h1>
      <p className="text-xs text-muted-foreground">Son güncelleme: 10 Mayıs 2026</p>

      <h2 className={H2}>1. Veri Sorumlusu</h2>
      <p className={P}>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca
        veri sorumlusu <strong>BlueDev</strong>&apos;tir (YapıOps platformu).
      </p>
      <p className={P}>
        İletişim:{' '}
        <a href="mailto:info@bluedev.dev" className="font-medium underline">
          info@bluedev.dev
        </a>
      </p>

      <h2 className={H2}>2. İşlenen Kişisel Veri Kategorileri</h2>
      <ul className={UL}>
        <li>
          <strong>Kimlik:</strong> Ad, soyad, TCKN (Ek-3 yapı sahibi alanı), VKN
          (kurumsal müteahhit/denetim firmaları)
        </li>
        <li>
          <strong>İletişim:</strong> E-posta adresi, telefon
        </li>
        <li>
          <strong>Mesleki:</strong> İMO oda sicil numarası, sorumlu mühendis
          bilgisi, müteahhit/yapı denetim firma kayıtları
        </li>
        <li>
          <strong>İşlem güvenliği:</strong> IP adresi, kullanıcı aracı (user
          agent), oturum bilgileri, audit log kayıtları
        </li>
        <li>
          <strong>Müşteri işlem:</strong> Hesap kullanım istatistikleri,
          üretilen Ek-3 sayısı, abonelik durumu
        </li>
        <li>
          <strong>Finansal:</strong> Fatura adresi, ödeme tutarı (kart bilgileri{' '}
          <strong>Iyzico</strong> aracılığıyla işlenir; YapıOps kart bilgisi
          saklamaz)
        </li>
      </ul>

      <h2 className={H2}>3. Kişisel Verilerin İşlenme Amaçları</h2>
      <ul className={UL}>
        <li>
          4708 sayılı Yapı Denetimi Hakkında Kanun gereği Ek-3 (Yapı Denetim
          Hizmet Sözleşmesi) elektronik formunun üretilmesi ve arşivlenmesi
        </li>
        <li>Hesap güvenliği, kimlik doğrulama (multi-tenant org yapısı)</li>
        <li>
          Ödeme tahsilatı ve e-fatura kesimi (213 sayılı VUK, 6502 sayılı
          Tüketici Kanunu)
        </li>
        <li>Hizmet sunumu, müşteri ilişkileri yönetimi, destek</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        <li>Anonimleştirilmiş analitik ile hizmet kalitesinin geliştirilmesi</li>
      </ul>

      <h2 className={H2}>4. Hukuki Sebepler</h2>
      <ul className={UL}>
        <li>KVKK Madde 5/2(a) — Açık rıza</li>
        <li>KVKK Madde 5/2(c) — Sözleşmenin kurulması ve ifası</li>
        <li>KVKK Madde 5/2(ç) — Hukuki yükümlülüğün yerine getirilmesi</li>
        <li>
          KVKK Madde 5/2(f) — Meşru menfaat (güvenlik, dolandırıcılık önleme)
        </li>
      </ul>

      <h2 className={H2}>5. Verilerin Aktarımı</h2>
      <p className={P}>
        Hizmet altyapısı için aşağıdaki sağlayıcılar veri işleyici sıfatıyla
        görev alır:
      </p>
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Sağlayıcı</th>
              <th className={TH}>Konum</th>
              <th className={TH}>Hizmet</th>
              <th className={TH}>Aktarım Türü</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TD}>Supabase</td>
              <td className={TD}>AB (Frankfurt)</td>
              <td className={TD}>Veritabanı, kimlik doğrulama</td>
              <td className={TD}>Yurt dışı (KVKK 9)</td>
            </tr>
            <tr>
              <td className={TD}>Vercel</td>
              <td className={TD}>ABD</td>
              <td className={TD}>Web uygulaması hosting</td>
              <td className={TD}>Yurt dışı (KVKK 9)</td>
            </tr>
            <tr>
              <td className={TD}>Resend</td>
              <td className={TD}>ABD</td>
              <td className={TD}>E-posta gönderimi</td>
              <td className={TD}>Yurt dışı (KVKK 9)</td>
            </tr>
            <tr>
              <td className={TD}>Cloudflare</td>
              <td className={TD}>ABD</td>
              <td className={TD}>DNS, e-posta yönlendirme</td>
              <td className={TD}>Yurt dışı (KVKK 9)</td>
            </tr>
            <tr>
              <td className={TD}>Iyzico</td>
              <td className={TD}>Türkiye</td>
              <td className={TD}>Ödeme işleme</td>
              <td className={TD}>Yurt içi</td>
            </tr>
            <tr>
              <td className={TD}>Foriba</td>
              <td className={TD}>Türkiye</td>
              <td className={TD}>E-fatura entegrasyonu</td>
              <td className={TD}>Yurt içi</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={P}>
        Yurt dışı aktarımlar KVKK Madde 9 kapsamında açık rıza ile yapılır.
        Ayrıca yetkili kamu kurum ve kuruluşlarına (4708 sayılı Kanun
        çerçevesinde Çevre, Şehircilik ve İklim Değişikliği Bakanlığı), yasal
        zorunluluk halinde aktarım yapılabilir.
      </p>

      <h2 className={H2}>6. Verilerin Toplanma Yöntemleri</h2>
      <ul className={UL}>
        <li>Web sitesi kayıt formu, giriş, hesap güncelleme</li>
        <li>
          Ek-3 ve diğer modüllerde girilen mühendislik verileri (proje, yapı,
          taraflar)
        </li>
        <li>
          API entegrasyonları (ETABS Bridge — masaüstü uygulama, Iyzico)
        </li>
        <li>
          Çerezler (oturum, tercih, analitik — kullanım için açık rızanız
          gereklidir)
        </li>
      </ul>

      <h2 className={H2}>7. KVKK Madde 11 — Veri Sahibi Hakları</h2>
      <p className={P}>Veri sahibi olarak şunları talep edebilirsiniz:</p>
      <ol className={OL}>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Yurt içi/yurt dışı aktarılan üçüncü kişileri öğrenme</li>
        <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini talep etme</li>
        <li>KVKK Madde 7 çerçevesinde silinmesini veya yok edilmesini talep etme</li>
        <li>
          Düzeltme/silme işlemlerinin verilerinizi aktardığımız üçüncü kişilere
          bildirilmesini talep etme
        </li>
        <li>Otomatik sistemlerle yapılan analize itiraz etme</li>
        <li>
          Kanuna aykırı işleme nedeniyle zarara uğradığınızda zararın
          giderilmesini talep etme
        </li>
      </ol>
      <p className={P}>
        Bu hakları kullanmak için{' '}
        <a href="mailto:info@bluedev.dev" className="font-medium underline">
          info@bluedev.dev
        </a>{' '}
        adresine yazılı başvurunuzu iletebilirsiniz. Başvurularınız 30 gün
        içinde yanıtlanır.
      </p>

      <h2 className={H2}>8. Saklama Süreleri</h2>
      <ul className={UL}>
        <li>
          Hesap aktif olduğu sürece ve hesap kapatıldıktan sonra 5 yıl (Vergi
          Usul Kanunu)
        </li>
        <li>
          Ek-3 belgeleri: yapı tamamlanıp iskan ruhsatı sonrası 30 yıl (yapı
          denetim mevzuatı)
        </li>
        <li>Audit log kayıtları: 5 yıl</li>
        <li>IP / oturum logları: 1 yıl</li>
      </ul>

      <h2 className={H2}>9. Güvenlik Tedbirleri</h2>
      <ul className={UL}>
        <li>TLS / HTTPS şifreleme (transit veriler)</li>
        <li>Veritabanı seviyesinde Row-Level Security (RLS)</li>
        <li>Rol bazlı erişim kontrolü (engineer / admin / owner / auditor)</li>
        <li>Audit log ile tüm hassas işlemlerin izlenmesi</li>
        <li>Düzenli güvenlik denetimleri (Supabase Security Advisor)</li>
        <li>Ödeme verileri PCI-DSS uyumlu Iyzico altyapısında işlenir</li>
      </ul>

      <h2 className={H2}>10. Değişiklikler</h2>
      <p className={P}>
        Bu metin güncellendiğinde önemli değişiklikler kayıtlı kullanıcılara
        e-posta ile bildirilir; sürekli erişilebilir olarak bu sayfada
        yayınlanır.
      </p>
    </article>
  );
}
