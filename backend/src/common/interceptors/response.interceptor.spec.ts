import { ResponseInterceptor } from './response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { StreamableFile } from '@nestjs/common';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps a plain object in the success envelope', async () => {
    const payload = { id: 1, name: 'test' };
    const callHandler: CallHandler = { handle: () => of(payload) };
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const result = await lastValueFrom(
      interceptor.intercept(context, callHandler),
    );

    expect(result).toEqual({
      success: true,
      data: payload,
      timestamp: expect.any(String),
    });
  });

  it('wraps an array in the success envelope', async () => {
    const payload = [{ id: 1 }, { id: 2 }];
    const callHandler: CallHandler = { handle: () => of(payload) };
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const result = await lastValueFrom(
      interceptor.intercept(context, callHandler),
    );

    expect(result).toEqual({
      success: true,
      data: payload,
      timestamp: expect.any(String),
    });
  });

  it('passes through StreamableFile responses', async () => {
    const stream = new StreamableFile(Buffer.from('test'));
    const callHandler: CallHandler = { handle: () => of(stream) };
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const result = await lastValueFrom(
      interceptor.intercept(context, callHandler),
    );
    expect(result).toBe(stream);
  });

  it('passes through 204 No Content responses', async () => {
    const callHandler: CallHandler = { handle: () => of(undefined) };
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 204 }),
      }),
    } as ExecutionContext;

    const result = await lastValueFrom(
      interceptor.intercept(context, callHandler),
    );
    expect(result).toBeUndefined();
  });
});
