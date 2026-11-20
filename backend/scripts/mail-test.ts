/**
 * Verifies the configured email provider and sends a test email.
 *   npm run mail:test -- you@gmail.com
 * Uses backend/.env, exactly like the API does.
 */
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigModule } from '../src/config/config.module';
import { MailModule } from '../src/mail/mail.module';
import { MailService } from '../src/mail/mail.service';

@Module({ imports: [AppConfigModule, MailModule] })
class MailTestModule {}

async function main() {
  const to = process.argv[2];
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error('Usage: npm run mail:test -- recipient@example.com');
    process.exit(2);
  }
  const app = await NestFactory.createApplicationContext(MailTestModule, {
    logger: ['error', 'warn', 'log'],
  });
  const mail = app.get(MailService);
  try {
    console.log(`Provider: ${mail.provider}`);
    await mail.verify();
    console.log('✔ Credentials verified');
    const sent = await mail.send(to, 'PIF Admin Panel — test email', 'otp', {
      name: 'there',
      code: '123456',
      minutes: 10,
    });
    if (!sent) throw new Error('Delivery failed — see the error above.');
    console.log(`✔ Test email sent to ${to}. Check the inbox (and the spam folder).`);
  } catch (err) {
    new Logger('mail:test').error((err as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
