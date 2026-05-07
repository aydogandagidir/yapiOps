import { type AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing, type Locale } from './routing';

const isLocale = (value: string | undefined): value is Locale =>
  value !== undefined && (routing.locales as readonly string[]).includes(value);

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : routing.defaultLocale;

  const messagesModule = (await import(`./messages/${locale}.json`)) as {
    default: AbstractIntlMessages;
  };

  return {
    locale,
    messages: messagesModule.default,
  };
});
