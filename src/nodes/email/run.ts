import nodemailer from 'nodemailer';

function templateString(template: string, data: any): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let value = data;
    for (const key of keys) {
      if (value === undefined || value === null) return '';
      value = value[key];
    }
    return value !== undefined ? String(value) : '';
  });
}

export async function run(
  input: any,
  config: any,
  credentials: Record<string, string>
): Promise<any> {
  const { host, port, secure, to, from, subject, body } = config;

  if (!host || !to || !from || !subject || !body) {
    throw new Error('Missing required fields: host, to, from, subject, or body');
  }

  const smtpUser = credentials['smtp_user'];
  const smtpPass = credentials['smtp_pass'];

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials (smtp_user, smtp_pass) are required');
  }

  // Template the fields
  const finalTo = templateString(to, { input });
  const finalFrom = templateString(from, { input });
  const finalSubject = templateString(subject, { input });
  const finalBody = templateString(body, { input });

  const transporter = nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: secure === true, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: finalFrom,
      to: finalTo,
      subject: finalSubject,
      text: finalBody, // using text field; could support html if needed
    });

    return {
      data: {
        messageId: info.messageId,
        status: 'sent',
      }
    };
  } catch (error: any) {
    throw { code: 'SMTP_ERROR', message: error.message };
  }
}
