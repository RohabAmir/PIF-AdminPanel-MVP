import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../config/app-config.service';

@Injectable()
export class PasswordService {
  /** Used to keep response timing equal when the email does not exist. */
  private readonly dummyHash = bcrypt.hashSync('timing-equaliser-password', 10);

  constructor(private readonly config: AppConfig) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.config.get('BCRYPT_ROUNDS'));
  }

  verify(plain: string, hash: string | null | undefined): Promise<boolean> {
    return bcrypt.compare(plain, hash ?? this.dummyHash);
  }
}
