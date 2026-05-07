import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `next/headers` and `next/navigation` aren't available in jsdom; route-helper
// tests only exercise pure functions but they still import the module graph.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: () => undefined, getAll: () => [] })),
  headers: vi.fn(() => ({ get: () => null })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('server-only', () => ({}));
