import { describe, expect, it, vi } from 'vitest';
import { extractOtpCode, Msg91EmailService } from './msg91-email-service.js';
import { createEmailService } from './email-service.js';
import type { AppConfig } from '../config.js';

describe('Msg91EmailService', () => {
  it('extracts 6-digit OTP code correctly from content', () => {
    expect(extractOtpCode('Verification Code: 492817')).toBe('492817');
    expect(extractOtpCode(undefined, 'Your login OTP is 123456')).toBe('123456');
    expect(extractOtpCode('No code here', 'Still no code')).toBeUndefined();
  });

  it('sends email successfully using MSG91 v5 API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', message: 'Queued' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const service = new Msg91EmailService({
      authKey: 'test_auth_key',
      domain: 'snap.palnadu.dev',
      fromEmail: 'otp@snap.palnadu.dev',
      fromName: 'SnapPrint Test',
      templateId: 'snap_otp',
    });

    await service.sendEmail({
      to: { email: 'owner@example.com', name: 'Shop Owner' },
      subject: 'SnapPrint Verification Code: 654321',
      html: '<p>Code: 654321</p>',
      text: 'Code: 654321',
      otp: '654321',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://control.msg91.com/api/v5/email/send');
    expect(options.headers.authkey).toBe('test_auth_key');

    const body = JSON.parse(options.body);
    expect(body.domain).toBe('snap.palnadu.dev');
    expect(body.template_id).toBe('snap_otp');
    expect(body.from.email).toBe('otp@snap.palnadu.dev');
    expect(body.recipients[0].to[0].email).toBe('owner@example.com');
    expect(body.recipients[0].variables.otp).toBe('654321');

    vi.unstubAllGlobals();
  });

  it('throws error when MSG91 returns error status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'error', message: 'Invalid domain' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const service = new Msg91EmailService({
      authKey: 'test_auth_key',
      domain: 'snap.palnadu.dev',
      fromEmail: 'otp@snap.palnadu.dev',
    });

    await expect(
      service.sendEmail({
        to: { email: 'bad@example.com' },
        subject: 'Code',
        html: '<p>123456</p>',
        text: '123456',
      })
    ).rejects.toThrow('MSG91 rejected email delivery: Invalid domain');

    vi.unstubAllGlobals();
  });

  it('createEmailService selects Msg91EmailService when configured', () => {
    const config = {
      nodeEnv: 'development',
      msg91AuthKey: 'test_key',
      msg91EmailDomain: 'snap.palnadu.dev',
      msg91EmailFrom: 'otp@snap.palnadu.dev',
      msg91EmailTemplateId: 'snap_otp',
    } as AppConfig;

    const service = createEmailService(config);
    expect(service).toBeInstanceOf(Msg91EmailService);
  });
});
