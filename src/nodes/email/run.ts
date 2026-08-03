import nodemailer from 'nodemailer';

function templateString(template: string, data: any): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let value = data;
    for (const key of keys) {
      if (value === undefined || value === null) return '';
      
      let resolvedKey = key;
      if (value[resolvedKey] === undefined) {
        const dashedKey = key.replace(/\s+/g, '-');
        if (value[dashedKey] !== undefined) {
          resolvedKey = dashedKey;
        }
      }

      if (value === data && value[resolvedKey] === undefined && value.input !== undefined) {
        let resolvedInputKey = key;
        if (value.input[resolvedInputKey] === undefined) {
          const dashedKey = key.replace(/\s+/g, '-');
          if (value.input[dashedKey] !== undefined) {
            resolvedInputKey = dashedKey;
          }
        }
        value = value.input[resolvedInputKey];
      } else {
        value = value[resolvedKey];
      }
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

  const smtpUser = credentials['smtp_user'] || process.env.SMTP_USER;
  const smtpPass = credentials['smtp_pass'] || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials (smtp_user, smtp_pass) are required. Please configure them in your .env file or your organization credentials.');
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
