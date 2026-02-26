import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';
import { AuditAction } from '../../../common/constants/status.constant';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<AuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap((response) => {
        const entityType = this.extractEntityType(context);
        const entityId = this.extractEntityId(request, response);

        this.auditService
          .log({
            actorId: user?.sub || 'unknown',
            actorEmail: user?.email || 'unknown',
            actorRole: user?.roles?.[0] || 'unknown',
            action,
            entityType,
            entityId: entityId || 'unknown',
            newValues: typeof response === 'object' ? response?.data : undefined,
            ipAddress: request.ip || request.socket?.remoteAddress,
            userAgent: request.headers?.['user-agent'],
          })
          .catch((err) => {
            this.logger.error(
              `Failed to create audit log: ${err.message}`,
              err.stack,
            );
          });
      }),
    );
  }

  private extractEntityType(context: ExecutionContext): string {
    const controllerName = context.getClass().name;
    // Derive entity type from controller name
    // e.g. CandidatesAdminController -> candidate_profile
    return controllerName
      .replace(/Controller$/, '')
      .replace(/Admin$|Self$|Public$/, '')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private extractEntityId(request: any, response: any): string | undefined {
    // Try route params first
    if (request.params?.id) return request.params.id;
    if (request.params?.candidateId) return request.params.candidateId;
    if (request.params?.jobId) return request.params.jobId;
    if (request.params?.employerId) return request.params.employerId;

    // Try response data
    if (response?.data?.id) return response.data.id;
    if (response?.id) return response.id;

    return undefined;
  }
}
