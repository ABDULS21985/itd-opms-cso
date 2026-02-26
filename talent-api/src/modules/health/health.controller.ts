import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness check' })
  check() {
    return {
      status: 'ok',
      service: 'talent-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check' })
  ready() {
    return {
      status: 'ok',
      service: 'talent-api',
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
}
