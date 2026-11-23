import type { AppConfig } from '../config.js';

export interface SendEmailParams {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

export interface EmailService {
  sendEmail(params: SendEmailParams): Promise<void>;
}

export class ZeptoMailEmailService implements EmailService {
  constructor(
    private readonly apiToken: string,
    private readonly fromEmail: string,
    private readonly fromName: string,
    private readonly bounceAddress?: string
  ) {}

  async sendEmail(params: SendEmailParams): Promise<void> {
    const payload = {
      from: { address: this.fromEmail, name: this.fromName },
      to: [
        {
          email_address: {
            address: params.to.email,
            name: params.to.name || '',
          },
        },
      ],
      subject: params.subject,
      htmlbody: params.html,
      textbody: params.text,
      ...(this.bounceAddress ? { bounce_address: this.bounceAddress } : {}),
    };

    const response = await fetch('https://api.zeptomail.in/v1.1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Zoho-enczapikey ${this.apiToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`ZeptoMail API error (${response.status})`);
    }
  }
}

export class MemoryEmailService implements EmailService {
  private sentEmails: SendEmailParams[] = [];

  async sendEmail(params: SendEmailParams): Promise<void> {
    this.sentEmails.push({ ...params });
  }

  getSentEmails(): readonly SendEmailParams[] {
    return [...this.sentEmails];
  }

  getLastEmailFor(email: string): SendEmailParams | undefined {
    return [...this.sentEmails]
      .reverse()
      .find((e) => e.to.email.toLowerCase() === email.toLowerCase());
  }

  clear(): void {
    this.sentEmails = [];
  }
}

export function createEmailService(config: AppConfig): EmailService {
  if (config.zeptoMailApiToken) {
    if (!config.zeptoMailFromEmail) {
      throw new Error('ZeptoMail configuration missing: ZEPTOMAIL_FROM_EMAIL must be configured.');
    }
    return new ZeptoMailEmailService(
      config.zeptoMailApiToken,
      config.zeptoMailFromEmail,
      config.zeptoMailFromName,
      config.zeptoMailBounceAddress
    );
  }
  if (config.nodeEnv !== 'test') {
    throw new Error('ZeptoMail configuration missing: ZEPTOMAIL_API_TOKEN must be configured.');
  }
  return new MemoryEmailService();
}
