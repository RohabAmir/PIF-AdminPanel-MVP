import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  TRUST_PROXY: Joi.number().integer().min(0).default(1),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  FRONTEND_URL: Joi.string().uri().required(),
  API_PUBLIC_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_OTP_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).max(90).default(7),
  REFRESH_REUSE_GRACE_SECONDS: Joi.number().integer().min(0).max(60).default(10),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  AUTH_RATE_LIMIT: Joi.number().integer().min(1).default(10),
  GLOBAL_RATE_LIMIT: Joi.number().integer().min(10).default(300),
  PUBLIC_FORM_RATE_LIMIT: Joi.number().integer().min(1).default(10),

  // smtp = any SMTP server (Mailpit locally) · gmail = Gmail SMTP with an app password ·
  // gmail-api = Gmail REST API over HTTPS with OAuth2 (for hosts that block SMTP ports)
  MAIL_PROVIDER: Joi.string().valid('smtp', 'gmail', 'gmail-api').default('smtp'),
  GMAIL_USER: Joi.when('MAIL_PROVIDER', {
    is: Joi.valid('gmail', 'gmail-api'),
    then: Joi.string().email().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  GMAIL_APP_PASSWORD: Joi.when('MAIL_PROVIDER', {
    is: 'gmail',
    then: Joi.string()
      .replace(/\s+/g, '')
      .length(16)
      .required()
      .messages({
        'string.length': 'GMAIL_APP_PASSWORD must be the 16-character Google app password',
      }),
    otherwise: Joi.string().allow('').default(''),
  }),
  GMAIL_CLIENT_ID: Joi.when('MAIL_PROVIDER', {
    is: 'gmail-api',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  GMAIL_CLIENT_SECRET: Joi.when('MAIL_PROVIDER', {
    is: 'gmail-api',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  GMAIL_REFRESH_TOKEN: Joi.when('MAIL_PROVIDER', {
    is: 'gmail-api',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().default(1025),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('PIF Admin Panel <no-reply@pifdemo.com>'),

  DEMO_MODE: Joi.boolean().default(false),
  DEMO_PASSWORD: Joi.string().default('Demo@12345'),

  MEDIA_DRIVER: Joi.string().valid('local', 'cloudinary', 'url').default('local'),
  UPLOAD_DIR: Joi.string().default('uploads'),
  MAX_UPLOAD_MB: Joi.number().min(1).max(20).default(5),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
});

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  LOG_LEVEL: string;
  TRUST_PROXY: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  API_PUBLIC_URL: string;
  CORS_ORIGINS: string;
  JWT_ACCESS_SECRET: string;
  JWT_OTP_SECRET: string;
  JWT_ACCESS_TTL: string;
  REFRESH_TOKEN_TTL_DAYS: number;
  REFRESH_REUSE_GRACE_SECONDS: number;
  BCRYPT_ROUNDS: number;
  COOKIE_SECURE: boolean;
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none';
  AUTH_RATE_LIMIT: number;
  GLOBAL_RATE_LIMIT: number;
  PUBLIC_FORM_RATE_LIMIT: number;
  MAIL_PROVIDER: 'smtp' | 'gmail' | 'gmail-api';
  GMAIL_USER: string;
  GMAIL_APP_PASSWORD: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  MAIL_FROM: string;
  DEMO_MODE: boolean;
  DEMO_PASSWORD: string;
  MEDIA_DRIVER: 'local' | 'cloudinary' | 'url';
  UPLOAD_DIR: string;
  MAX_UPLOAD_MB: number;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
}
