import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Get()
  @Public()
  getRoot() {
    return {
      service: 'talent-api',
      version: '1.0.0',
      docs: '/docs',
      health: '/api/v1/health',
    };
  }
}
