import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

// Only log actual writes — reads (GET) don't need an audit trail
const AUDITED_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

// Never write these fields into the audit log, even inside metadata
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'token',
  'refreshToken',
  'accessToken',
  'otp',
];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (!AUDITED_METHODS.includes(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget: don't make the user's request wait on the audit write,
        // and don't let a logging failure break the actual API response.
        this.writeAuditLog(request).catch((err) => {
          console.error('Audit log write failed:', err?.message);
        });
      }),
    );
  }

  private async writeAuditLog(request: any) {
    const userId: string | undefined = request.user?.sub;
    const ipAddress: string =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    // Turn "/appointments/abc123/status" into entityType "appointments"
    const routeParts = request.route?.path?.split('/').filter(Boolean) || [];
    const entityType = routeParts[0] || 'unknown';

    // Grab an id from route params if present, e.g. :id
    const entityId =
      request.params?.id ?? request.params?.patientId ?? undefined;

    const sanitizedBody = this.sanitize(request.body);

    await this.prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action: request.method,
        entityType,
        entityId: entityId ?? null,
        ipAddress,
        metadata: JSON.stringify(sanitizedBody).slice(0, 2000), // cap size
      },
    });
  }

  private sanitize(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const clone = { ...body };
    for (const field of SENSITIVE_FIELDS) {
      if (field in clone) clone[field] = '[REDACTED]';
    }
    return clone;
  }
}