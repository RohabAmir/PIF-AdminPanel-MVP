import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { AppConfig } from '../config/app-config.service';
import { DEMO_ACCOUNTS } from './demo';

@ApiTags('Meta')
@Controller('meta')
export class MetaController {
  constructor(private readonly config: AppConfig) {}

  @Get('config')
  @Public()
  @ApiOkResponse({ description: 'Public, non-secret runtime configuration for the admin UI.' })
  getConfig() {
    const demo = this.config.get('DEMO_MODE');
    const driver = this.config.get('MEDIA_DRIVER');
    return {
      demoMode: demo,
      demoAccounts: demo
        ? DEMO_ACCOUNTS.map((a) => ({ ...a, password: this.config.get('DEMO_PASSWORD') }))
        : [],
      uploadsEnabled: driver !== 'url',
      mediaDriver: driver,
      maxUploadMb: this.config.get('MAX_UPLOAD_MB'),
    };
  }
}
