# Global API Response Envelope

## Goal

Standardize all API responses with a consistent success/error envelope, and update the frontend to handle the new shape.

## Envelope Shape

### Success
```json
{ "success": true, "data": <payload>, "timestamp": "2026-06-14T12:00:00.000Z" }
```

### Error
```json
{ "success": false, "data": null, "error": { "code": 404, "message": "Not Found", "details": ["..."] }, "timestamp": "..." }
```

No `meta` or `message` fields — the payload is returned as-is.

## Backend

### ResponseInterceptor
- Skips `204 No Content` and `StreamableFile`
- Wraps everything else in `{ success: true, data, timestamp }`

### HttpExceptionFilter
- `HttpException` → `{ success: false, data: null, error: { code, message, details }, timestamp }`
- Validation errors (status 400) → maps NestJS validation error array into `details`
- Unhandled errors → 500

### Registration
- Both registered globally in `app.module.ts` via `APP_INTERCEPTOR` / `APP_FILTER` providers

### New files
- `backend/src/common/interceptors/response.interceptor.ts`
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/common/interfaces/api-response.interface.ts`

## Frontend

### Axios interceptor (in `api.ts`)
- Success: `return response.data.data` (unwraps payload)
- App error (`success === false`): `return Promise.reject({ code, message, details })`
- Network error: `return Promise.reject({ code: 0, message: 'Network error', details: [] })`
- Blob passthrough: skip if `response.config.responseType === 'blob'`
- 204 passthrough: skip if `response.status === 204`

### API functions (all 5 API files)
Change from `const { data } = await get<T>(url); return data` to `return await get<T>(url)`

## Files to modify
- `backend/src/app.module.ts`
- `frontend/src/services/api/api.ts`
- `frontend/src/services/api/mangaApi.ts`
- `frontend/src/services/api/authorApi.ts`
- `frontend/src/services/api/genreApi.ts`
- `frontend/src/services/api/translatorApi.ts`
- `frontend/src/services/api/languageApi.ts`
