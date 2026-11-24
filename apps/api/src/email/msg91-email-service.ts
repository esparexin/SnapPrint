import type { EmailService, SendEmailParams } from './email-service.js';

export interface Msg91EmailServiceOptions {
  authKey: string;
  domain: string;
  fromEmail: string;
  fromName?: string;
  templateId?: string;
  endpointUrl?: string;
}

export function extractOtpCode(...sources: (string | undefined)[]): string | undefined {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(/\b\d{6}\b/);
    if (match) return match[0];
  }
  return undefined;
}

export class Msg91EmailService implements EmailService {
  private readonly authKey: string;
  private readonly domain: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly templateId?: string;
  private readonly endpointUrl: string;

  constructor(options: Msg91EmailServiceOptions) {
    if (!options.authKey) {
      throw new Error('MSG91 configuration missing: authKey must be provided.');
    }
    if (!options.domain) {
      throw new Error('MSG91 configuration missing: domain must be provided.');
    }
    if (!options.fromEmail) {
      throw new Error('MSG91 configuration missing: fromEmail must be provided.');
    }
    this.authKey = options.authKey;
    this.domain = options.domain;
    this.fromEmail = options.fromEmail;
    this.fromName = options.fromName || 'SnapPrint';
    this.templateId = options.templateId;
    this.endpointUrl = options.endpointUrl || 'https://control.msg91.com/api/v5/email/send';
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    const otpCode = params.otp ?? extractOtpCode(params.subject, params.text) ?? '';
    const recipientVariables: Record<string, string> = {
      name: params.to.name?.trim() || 'Shop Owner',
      otp: otpCode,
      ...(params.variables ?? {}),
    };

    const payload: Record<string, unknown> = {
      recipients: [
        {
          to: [
            {
              name: params.to.name?.trim() || 'Shop Owner',
              email: params.to.email.trim(),
            },
          ],
          variables: recipientVariables,
        },
      ],
      from: {
        name: this.fromName,
        email: this.fromEmail,
      },
      domain: this.domain,
    };

    if (this.templateId) {
      payload.template_id = this.templateId;
    } else {
      payload.subject = params.subject;
      payload.body = params.html || params.text;
    }

    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        authkey: this.authKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`MSG91 API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = (await response.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      hasError?: boolean;
    };

    if (data.status === 'error' || data.hasError === true) {
      throw new Error(`MSG91 rejected email delivery: ${data.message || 'Unknown MSG91 error'}`);
    }
  }
}
