import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@yapiops/ai',
    '@yapiops/audit',
    '@yapiops/auth',
    '@yapiops/billing',
    '@yapiops/db',
    '@yapiops/ui',
  ],
  // typedRoutes Next.js 15'te stable; experimental'den root'a taşındı.
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Supabase storage public URLs (e.g. brand assets, signed URLs).
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default withNextIntl(nextConfig);
