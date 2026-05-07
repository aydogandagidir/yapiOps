import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureMock = vi.fn();
const flushMock = vi.fn().mockResolvedValue(undefined);

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: captureMock,
    flush: flushMock,
  })),
}));

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

describe('captureServerEvent', () => {
  beforeEach(() => {
    captureMock.mockClear();
    flushMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_KEY != null) process.env.NEXT_PUBLIC_POSTHOG_KEY = ORIGINAL_KEY;
    else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  });

  it('is a no-op when NEXT_PUBLIC_POSTHOG_KEY is missing', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { captureServerEvent } = await import('@/lib/posthog-server');
    captureServerEvent({ distinctId: 'org-1', event: 'ek3_created' });
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('forwards event payload to posthog-node when key is present', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phk_test_123';
    const { captureServerEvent } = await import('@/lib/posthog-server');
    captureServerEvent({
      distinctId: 'org-1',
      event: 'ek3_created',
      userId: 'user-1',
      properties: { projectId: 'proj-1' },
    });
    expect(captureMock).toHaveBeenCalledWith({
      distinctId: 'org-1',
      event: 'ek3_created',
      properties: { userId: 'user-1', projectId: 'proj-1' },
    });
  });

  it('omits userId from properties when not provided', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phk_test_123';
    const { captureServerEvent } = await import('@/lib/posthog-server');
    captureServerEvent({ distinctId: 'org-1', event: 'project_created' });
    const call = captureMock.mock.calls[0]?.[0] as { properties: Record<string, unknown> };
    expect(call.properties).not.toHaveProperty('userId');
  });

  it('swallows internal capture errors silently (request flow not blocked)', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phk_test_123';
    captureMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { captureServerEvent } = await import('@/lib/posthog-server');
    expect(() =>
      captureServerEvent({ distinctId: 'org-1', event: 'ek3_created' }),
    ).not.toThrow();
  });
});

describe('flushPostHog', () => {
  beforeEach(() => {
    captureMock.mockClear();
    flushMock.mockClear();
    vi.resetModules();
  });

  it('is a no-op when client never initialized', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { flushPostHog } = await import('@/lib/posthog-server');
    await expect(flushPostHog()).resolves.toBeUndefined();
    expect(flushMock).not.toHaveBeenCalled();
  });

  it('flushes pending events when client exists', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phk_test_123';
    const { captureServerEvent, flushPostHog } = await import('@/lib/posthog-server');
    captureServerEvent({ distinctId: 'org-1', event: 'ek3_created' });
    await flushPostHog();
    expect(flushMock).toHaveBeenCalledTimes(1);
  });
});
