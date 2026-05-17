import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

vi.mock('@react-email/components', async () => {
  const actual = await vi.importActual('@react-email/components');
  return {
    ...actual,
    render: vi.fn(() => Promise.resolve('<html><body>mocked email body</body></html>')),
  };
});

const ORIGINAL_KEY = process.env.RESEND_API_KEY;

const baseInput = {
  to: 'engineer@example.com',
  locale: 'tr' as const,
  recipientName: 'Mehmet Yılmaz',
  projectName: 'Atatürk Bulvarı 4 Daireli',
  ek3Version: 1,
  pdfUrl: 'https://example.com/storage/ek3-pdfs/org-1/proj-1/ek3-1.pdf',
  appUrl: 'https://yapiops.com',
};

describe('sendEk3GeneratedEmail', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: 'msg_test_123' }, error: null });
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_KEY != null) process.env.RESEND_API_KEY = ORIGINAL_KEY;
    else delete process.env.RESEND_API_KEY;
  });

  it('skips with reason="no_recipient" when `to` is empty', async () => {
    process.env.RESEND_API_KEY = 're_test_xyz';
    const { sendEk3GeneratedEmail } = await import('../src/index');
    const result = await sendEk3GeneratedEmail({ ...baseInput, to: '' });
    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') expect(result.reason).toBe('no_recipient');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('skips with reason="no_api_key" when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEk3GeneratedEmail } = await import('../src/index');
    const result = await sendEk3GeneratedEmail(baseInput);
    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') expect(result.reason).toBe('no_api_key');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends with TR subject when locale is "tr"', async () => {
    process.env.RESEND_API_KEY = 're_test_xyz';
    const { sendEk3GeneratedEmail } = await import('../src/index');
    const result = await sendEk3GeneratedEmail(baseInput);
    expect(result.status).toBe('sent');
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0]?.[0] as { subject: string; to: string; html: string };
    expect(call.subject).toBe('Ek-3 PDF üretildi');
    expect(call.to).toBe('engineer@example.com');
  });

  it('sends with EN subject when locale is "en"', async () => {
    process.env.RESEND_API_KEY = 're_test_xyz';
    const { sendEk3GeneratedEmail } = await import('../src/index');
    const result = await sendEk3GeneratedEmail({ ...baseInput, locale: 'en' });
    expect(result.status).toBe('sent');
    const call = sendMock.mock.calls[0]?.[0] as { subject: string };
    expect(call.subject).toBe('Your Ek-3 PDF is ready');
  });

  it('throws a wrapped error when Resend returns an error', async () => {
    process.env.RESEND_API_KEY = 're_test_xyz';
    sendMock.mockResolvedValueOnce({ data: null, error: { message: 'rate_limited' } });
    const { sendEk3GeneratedEmail } = await import('../src/index');
    await expect(sendEk3GeneratedEmail(baseInput)).rejects.toThrow(/rate_limited/);
  });

  it('returns the Resend message id for tracing', async () => {
    process.env.RESEND_API_KEY = 're_test_xyz';
    const { sendEk3GeneratedEmail } = await import('../src/index');
    const result = await sendEk3GeneratedEmail(baseInput);
    if (result.status === 'sent') expect(result.messageId).toBe('msg_test_123');
  });
});
