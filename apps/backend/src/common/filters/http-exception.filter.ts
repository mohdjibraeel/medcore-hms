import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();

    // Nest's built-in exceptions (NotFoundException, etc.) return either
    // a string or an object like { message, error, statusCode }.
    // We need to pull the actual message out regardless of which shape it is.
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message;

    response.status(status).json({
      success: false,
      error: {
        code: this.mapStatusToCode(status),
        message,
      },
    });
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}