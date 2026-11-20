import { envValidationSchema } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://u:p@h:5432/d',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_OTP_SECRET: 'b'.repeat(40),
  FRONTEND_URL: 'https://example.com',
  API_PUBLIC_URL: 'https://example.com',
  CORS_ORIGINS: 'https://example.com',
};

describe('env validation', () => {
  it('treats blank numbers and booleans as unset (hosts send empty strings for blank fields)', () => {
    const { error, value } = envValidationSchema.validate(
      { ...base, SMTP_PORT: '', SMTP_SECURE: '', PORT: '', DEMO_MODE: '' },
      { allowUnknown: true },
    );
    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      PORT: 3000,
      DEMO_MODE: false,
    });
  });

  it('still rejects invalid values', () => {
    const { error } = envValidationSchema.validate(
      { ...base, SMTP_PORT: 'abc' },
      { allowUnknown: true },
    );
    expect(error?.message).toMatch(/SMTP_PORT/);
  });
});
