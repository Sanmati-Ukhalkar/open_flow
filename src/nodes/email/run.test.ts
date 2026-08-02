import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

const mockSendMail = vi.fn();

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn().mockImplementation(() => {
        return {
          sendMail: mockSendMail,
        };
      }),
    },
  };
});

describe('Email Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully send an email using nodemailer', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' });

    const config = {
      host: 'smtp.example.com',
      port: 587,
      to: 'to@example.com',
      from: 'from@example.com',
      subject: 'Test subject',
      body: 'Test body',
    };

    const credentials = {
      smtp_user: 'user',
      smtp_pass: 'pass',
    };

    const result = await run({}, config, credentials);

    expect(result).toEqual({
      messageId: 'msg-123',
      status: 'sent',
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'Test subject',
      text: 'Test body',
    });
  });

  it('should throw an error on missing config fields', async () => {
    const config = { host: '' };
    await expect(run({}, config, {})).rejects.toThrow('Missing required fields');
  });

  it('should throw an error on missing credentials', async () => {
    const config = {
      host: 'smtp.example.com',
      to: 'to@example.com',
      from: 'from@example.com',
      subject: 'Subject',
      body: 'Body',
    };
    await expect(run({}, config, {})).rejects.toThrow('SMTP credentials');
  });
});
