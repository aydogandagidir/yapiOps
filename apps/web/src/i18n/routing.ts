import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'always',
  // YapıOps Türkiye yapı denetim sektörüne hizmet veren bir SaaS. Browser
  // dil tercihi ne olursa olsun varsayılan UI Türkçe. EN locale URL'si
  // (/en/...) hâlâ erişilebilir (uluslararası kullanıcılar için), ancak
  // kullanıcı `/`'a girdiğinde otomatik /tr'ye yönlendirilir.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
