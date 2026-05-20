import type { Config } from 'tailwindcss';

import baseConfig from '@yapiops/config/tailwind';

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx,mdx}', '../../packages/@yapiops/ui/src/**/*.{ts,tsx}'],
};

export default config;
