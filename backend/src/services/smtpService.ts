import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

/**
 * Lazy-initialized transporter — created once on first use.
 * Ethereal credentials come from env; no credentials are ever logged.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: false, // Ethereal uses STARTTLS on port 587
      auth: {
        user: env.smtp.user,
        pass: env.smtp.password,
      },
    });
  }
  return transporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

/**
 * Sends an email via Ethereal SMTP.
 * Returns the Ethereal preview URL so you can inspect the sent message
 * at https://ethereal.email without a real inbox.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ previewUrl: string | false }> {
  const info = await getTransporter().sendMail({
    from: env.smtp.from,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  // nodemailer.getTestMessageUrl returns the Ethereal preview URL (string) or false
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { previewUrl };
}
