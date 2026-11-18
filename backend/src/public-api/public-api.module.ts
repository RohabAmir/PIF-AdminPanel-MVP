import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';

@Module({ controllers: [PublicApiController], providers: [PublicApiService, ApiKeyGuard] })
export class PublicApiModule {}
