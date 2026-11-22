import { describe, expect, it, vi } from 'vitest';
import { createEmailService, MemoryEmailService, ZeptoMailEmailService } from './email-service.js';
import { renderLoginOtpEmail, renderRegistrationOtpEmail } from './email-templates.js';
import type { AppConfig } from '../config.js';

describe('Email Service & Delivery Adapters', () => {
  it('MemoryEmailService stores and retrieves sent emails', async () => {
    const memory = new MemoryEmailService();

    const res = await memory.sendEmail({
      to: { email: 'owner@studio.com', name: 'Studio Owner' },
      subject: 'Verification Code',
      html: '<p>Code: 123456</p>',
      text: 'Code: 123456',
    });

    expect(res.delivered).toBe(true);
    expect(res.messageId).toMatch(/^mem_/);
    expect(memory.getSentEmails()).toHaveLength(1);

    const last = memory.getLastEmailFor('OWNER@STUDIO.COM');
    expect(last).toBeDefined();
    expect(last?.subject).toBe('Verification Code');

    memory.clear();
    expect(memory.getSentEmails()).toHaveLength(0);
  });

  it('ZeptoMailEmailService dispatches email with correct headers and payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ message_id: 'zepto_msg_12345' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const zepto = new ZeptoMailEmailService(
      'test_api_token',
      'noreply@snapprint.in',
      'SnapPrint Alerts',
      'bounce@snapprint.in'
    );

    const result = await zepto.sendEmail({
      to: { email: 'client@example.com', name: 'Client' },
      subject: 'Your Login Code',
      html: '<b>123456</b>',
      text: '123456',
    });

    expect(result.delivered).toBe(true);
    expect(result.messageId).toBe('zepto_msg_12345');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.zeptomail.in/v1.1/email');
    expect(options.headers.Authorization).toBe('Zoho-enczapikey test_api_token');

    const body = JSON.parse(options.body);
    expect(body.from.address).toBe('noreply@snapprint.in');
    expect(body.bounce_address).toBe('bounce@snapprint.in');
    expect(body.to[0].email_address.address).toBe('client@example.com');

    vi.unstubAllGlobals();
  });

  it('ZeptoMailEmailService throws informative error on API failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid Authorization Token',
    });
    vi.stubGlobal('fetch', mockFetch);

    const zepto = new ZeptoMailEmailService('bad_token', 'noreply@snapprint.in', 'SnapPrint');

    await expect(
      zepto.sendEmail({
        to: { email: 'client@example.com' },
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      })
    ).rejects.toThrow('ZeptoMail API error (401): Invalid Authorization Token');

    vi.unstubAllGlobals();
  });

  it('createEmailService instantiates appropriate adapter based on config', () => {
    const devConfig = {
      zeptoMailFromEmail: 'noreply@snapprint.in',
      zeptoMailFromName: 'SnapPrint',
    } as AppConfig;
    const memService = createEmailService(devConfig);
    expect(memService).toBeInstanceOf(MemoryEmailService);

    const prodConfig = {
      zeptoMailApiToken: 'prod_token',
      zeptoMailFromEmail: 'noreply@snapprint.in',
      zeptoMailFromName: 'SnapPrint',
      zeptoMailBounceAddress: 'bounce@snapprint.in',
    } as AppConfig;
    const zeptoService = createEmailService(prodConfig);
    expect(zeptoService).toBeInstanceOf(ZeptoMailEmailService);

    const prodMissingToken = {
      nodeEnv: 'production',
      zeptoMailFromEmail: 'noreply@snapprint.in',
      zeptoMailFromName: 'SnapPrint',
    } as AppConfig;
    expect(() => createEmailService(prodMissingToken)).toThrow(
      'ZeptoMail configuration missing in production: ZEPTOMAIL_API_TOKEN must be configured.'
    );
  });

  it('email templates render code, expiry time, and plain-text fallback', () => {
    const reg = renderRegistrationOtpEmail('882910', 15);
    expect(reg.subject).toContain('882910');
    expect(reg.html).toContain('882910');
    expect(reg.html).toContain('15 minutes');
    expect(reg.text).toContain('882910');

    const login = renderLoginOtpEmail('441209', 15);
    expect(login.subject).toContain('441209');
    expect(login.html).toContain('441209');
    expect(login.text).toContain('441209');
  });
});
