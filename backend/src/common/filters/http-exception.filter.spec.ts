import {
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockHttpArgumentsHost: jest.Mock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    mockHttpArgumentsHost = jest.fn().mockReturnValue({
      getResponse: mockGetResponse,
    });
  });

  it('formats a 404 HttpException correctly', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const host = {
      switchToHttp: mockHttpArgumentsHost,
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 404,
        message: 'Not Found',
        details: [],
      },
      timestamp: expect.any(String),
    });
  });

  it('formats a BadRequestException with validation errors', () => {
    const validationErrors = ['title must be a string', 'status is required'];
    const exception = new BadRequestException(validationErrors);
    const host = {
      switchToHttp: mockHttpArgumentsHost,
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 400,
        message: 'Bad Request',
        details: validationErrors,
      },
      timestamp: expect.any(String),
    });
  });

  it('handles unhandled non-HTTP exceptions as 500', () => {
    const exception = new Error('Unexpected error');
    const host = {
      switchToHttp: mockHttpArgumentsHost,
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 500,
        message: 'Internal Server Error',
        details: [],
      },
      timestamp: expect.any(String),
    });
  });
});
