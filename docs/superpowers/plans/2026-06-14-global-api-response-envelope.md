# Global API Response Envelope — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap all backend API responses in a consistent `{ success, data, timestamp }` envelope and update the frontend to handle the new shape.

**Architecture:** A NestJS `ResponseInterceptor` wraps successful responses, an `HttpExceptionFilter` formats errors, and an Axios response interceptor on the frontend unwraps the envelope transparently.

**Tech Stack:** NestJS, TypeORM, TypeScript, Jest, Axios, TanStack Query

---

### Task 1: Create shared API response interfaces

**Skills:** None

**Files:**
- Create: `backend/src/common/interfaces/api-response.interface.ts`

- [ ] **Step 1: Write the interface file**

```typescript
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  timestamp: string
}

export interface ApiError {
  code: number
  message: string
  details: string[]
}

export interface ApiErrorResponse {
  success: false
  data: null
  error: ApiError
  timestamp: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
```

- [ ] **Step 2: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/common/interfaces/api-response.interface.ts
git commit -m "feat: add ApiResponse shared interfaces"
```

---

### Task 2: Create ResponseInterceptor

**Skills:** `nestjs-best-practices` (rule 8.2: Use Interceptors for Cross-Cutting Concerns), `nestjs-testing` (testing interceptors), `javascript-typescript-jest` (test structure & mocking)

**Files:**
- Create: `backend/src/common/interceptors/response.interceptor.ts`
- Test: Need to create `backend/src/common/interceptors/response.interceptor.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/common/interceptors/response.interceptor.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npx jest src/common/interceptors/response.interceptor.spec.ts --no-coverage
```

Expected: FAIL — "Cannot find module" since the interceptor file doesn't exist yet.

- [ ] **Step 3: Write the interceptor implementation**

Create `backend/src/common/interceptors/response.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, Record<string, unknown> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Record<string, unknown> | T> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        if (response.statusCode === 204) {
          return data;
        }

        if (data instanceof StreamableFile) {
          return data;
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npx jest src/common/interceptors/response.interceptor.spec.ts --no-coverage
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/common/interceptors/response.interceptor.ts backend/src/common/interceptors/response.interceptor.spec.ts
git commit -m "feat: add ResponseInterceptor for success envelope"
```

---

### Task 3: Create HttpExceptionFilter

**Skills:** `nestjs-best-practices` (rule 3.3: Use Exception Filters for Error Handling), `nestjs-testing` (testing filters), `javascript-typescript-jest` (test structure & mocking)

**Files:**
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Test: `backend/src/common/filters/http-exception.filter.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/common/filters/http-exception.filter.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npx jest src/common/filters/http-exception.filter.spec.ts --no-coverage
```

Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Write the filter implementation**

Create `backend/src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let details: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;

        if (Array.isArray(resp.message)) {
          details = resp.message as string[];
          message = 'Bad Request';
        }
      }
    }

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: status,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npx jest src/common/filters/http-exception.filter.spec.ts --no-coverage
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/common/filters/http-exception.filter.ts backend/src/common/filters/http-exception.filter.spec.ts
git commit -m "feat: add HttpExceptionFilter for error envelope"
```

---

### Task 4: Register interceptor and filter globally in AppModule

**Skills:** `nestjs-best-practices` (rule 1.2: Organize by Feature Modules, rule 2.4: Prefer Constructor Injection)

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Add imports and providers**

In `backend/src/app.module.ts`, add at the top with other imports:

```typescript
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
```

In the `providers` array (after the `ThrottlerGuard` entry), add:

```typescript
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
```

- [ ] **Step 2: Run tests to verify no regression**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npm run test
```

Expected: All existing tests pass. Note: some controller tests may fail because they expect raw payloads but now get wrapped responses — update those tests to expect `{ success: true, data: <expected>, timestamp: expect.any(String) }`.

If tests fail, update the affected `.spec.ts` files to match the new envelope shape (check `expect(...)` calls in controller specs that assert response payloads).

- [ ] **Step 3: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/app.module.ts
# Also add any test spec files that needed updating
git commit -m "feat: register ResponseInterceptor and HttpExceptionFilter globally"
```

---

### Task 5: Update frontend Axios instance with response interceptor

**Skills:** None

**Files:**
- Modify: `frontend/src/services/api/api.ts`

- [ ] **Step 1: Add response interceptor**

In `frontend/src/services/api/api.ts`, add after the `axiosInstance` creation:

```typescript
export interface ApiErrorPayload {
  code: number
  message: string
  details: string[]
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  data: null
  error: ApiErrorPayload
  timestamp: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response
    }

    if (response.status === 204) {
      return response
    }

    const body = response.data as ApiResponse<unknown>

    if (!body.success) {
      return Promise.reject(body.error)
    }

    response.data = body.data
    return response
  },
  (error) => {
    if (!error.response) {
      return Promise.reject({
        code: 0,
        message: 'Network error',
        details: [],
      } satisfies ApiErrorPayload)
    }
    return Promise.reject(error)
  },
)
```

- [ ] **Step 2: Run frontend build to verify types**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\frontend"
npm run build
```

Expected: Build compiles. If there are type errors (e.g., in hook files that import response types), those will need fixing in Task 6.

- [ ] **Step 3: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add frontend/src/services/api/api.ts
git commit -m "feat: add Axios response interceptor for API envelope"
```

---

### Task 6: Update all frontend API functions to use unwrapped pattern

**Skills:** None

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`
- Modify: `frontend/src/services/api/authorApi.ts`
- Modify: `frontend/src/services/api/genreApi.ts`
- Modify: `frontend/src/services/api/translatorApi.ts`
- Modify: `frontend/src/services/api/languageApi.ts`

- [ ] **Step 1: Update each API file**

For every function that currently does:
```typescript
const { data } = await axiosInstance.get<T>(url)
return data
```
or:
```typescript
const res = await axiosInstance.get<T>(url)
return res.data
```

Change to:
```typescript
const { data } = await axiosInstance.get<T>(url)
return data
```

**Wait** — the interceptor in Task 5 modifies `response.data = body.data` so `response.data` is already the unwrapped payload. The existing pattern `const { data } = await get<T>(); return data` will **continue to work** because:
1. Axios resolves with the full response object
2. The interceptor set `response.data` to the unwrapped payload
3. Destructuring `{ data }` gets the unwrapped payload

So **no changes needed** to API function implementations. The interceptor handles everything transparently.

However, verify that all functions work correctly:
- `deleteManga()` returns `void` (204, interceptor passes through) — no change needed
- `getTemplateImport()` uses `responseType: 'blob'` — interceptor passes through — no change needed

- [ ] **Step 2: Run frontend build to verify**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\frontend"
npm run build
```

Expected: Build compiles without errors.

- [ ] **Step 3: Run frontend tests**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\frontend"
npm run test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add -A
git commit -m "chore: adapt API functions to new response envelope"
```

---

### Task 7: Run full verification

**Skills:** `nestjs-testing` (backend test suite), `vitest` (frontend test suite)

- [ ] **Step 1: Run backend tests**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npm run test
```

Expected: All tests pass (including the new interceptor/filter tests and any updated controller tests).

- [ ] **Step 2: Run backend build**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npm run build
```

Expected: Compiles without errors.

- [ ] **Step 3: Run frontend tests**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\frontend"
npm run test
```

Expected: All tests pass.

- [ ] **Step 4: Run frontend lint + type check**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\frontend"
npm run check
```

Expected: No errors.
