import type { Rendered } from "./templates";

export interface Mailer {
  send(to: string, msg: Rendered): Promise<void>;
}

/** Dev/test mailer: records messages in memory, logs subject only (no PII bodies in logs). */
export class MemoryMailer implements Mailer {
  static sent: { to: string; subject: string; text: string }[] = [];
  async send(to: string, msg: Rendered) {
    MemoryMailer.sent.push({ to, subject: msg.subject, text: msg.text });
    if (process.env.LOG_SILENT !== "1") console.log(`[mail:dev] -> ${msg.subject}`);
  }
}

class SmtpMailer implements Mailer {
  constructor(private url: string, private from: string) {}
  private transport?: import("nodemailer").Transporter;
  async send(to: string, msg: Rendered) {
    if (!this.transport) {
      const nodemailer = await import("nodemailer");
      this.transport = nodemailer.createTransport(this.url);
    }
    await this.transport.sendMail({ from: this.from, to, subject: msg.subject, text: msg.text, html: msg.html });
  }
}

let override: Mailer | null = null;
export function setMailerForTests(m: Mailer | null) {
  override = m;
}

export function getMailer(): Mailer {
  if (override) return override;
  const url = process.env.SMTP_URL;
  if (url) return new SmtpMailer(url, process.env.MAIL_FROM ?? "no-reply@example.com");
  if (process.env.NODE_ENV === "production") throw new Error("SMTP_URL not configured");
  return new MemoryMailer();
}
