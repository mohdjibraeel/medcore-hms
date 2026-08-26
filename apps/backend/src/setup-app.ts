import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import cookieParser from 'cookie-parser';

/**
 * Everything here must stay identical between the real server (main.ts)
 * and our automated tests. If they drift apart, tests could pass while
 * the real app behaves differently — which defeats the purpose of testing.
 */
export function configureApp(app: INestApplication) {
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  return app;
}