import nodemailer, { Transporter } from 'nodemailer';
import { db } from '../../../src/db/index.pg.ts';
import { notifications, tenants } from '../../../src/db/schema.pg.ts';
import { eq, and } from 'drizzle-orm';

export interface SendEmailOptions {
  tenantId: string; toEmail: string; subject: string;
  bodyHtml: string; type: string;
  refType?: string; refId?: string; userId?: string;
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.ethereal.email',
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  async queue(opts: SendEmailOptions): Promise<void> {
    await db.insert(notifications).values({
      tenantId: opts.tenantId, userId: opts.userId ?? null,
      type: opts.type as any, toEmail: opts.toEmail,
      subject: opts.subject, bodyHtml: opts.bodyHtml,
      refType: opts.refType ?? null, refId: opts.refId ?? null,
    });
  }

  async sendNow(opts: SendEmailOptions): Promise<void> {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, opts.tenantId) });
    const from   = tenant?.emailFrom || process.env.SMTP_DEFAULT_FROM || 'noreply@doccollector.it';
    await this.transporter.sendMail({ from, to: opts.toEmail, subject: opts.subject, html: opts.bodyHtml });
  }

  async processQueue(): Promise<void> {
    const pending = await db.select().from(notifications)
      .where(eq(notifications.status, 'pending')).limit(50);

    for (const n of pending) {
      try {
        const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, n.tenantId) });
        const from   = tenant?.emailFrom || process.env.SMTP_DEFAULT_FROM || 'noreply@doccollector.it';
        await this.transporter.sendMail({ from, to: n.toEmail, subject: n.subject, html: n.bodyHtml });
        await db.update(notifications)
          .set({ status: 'sent', sentAt: new Date(), attempts: n.attempts + 1 })
          .where(eq(notifications.id, n.id));
      } catch (err: any) {
        await db.update(notifications)
          .set({ status: n.attempts >= 3 ? 'failed' : 'pending',
                 failReason: err.message, attempts: n.attempts + 1 })
          .where(eq(notifications.id, n.id));
      }
    }
  }
}

export const emailService = new EmailService();