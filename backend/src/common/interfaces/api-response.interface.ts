export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  code: number;
  message: string;
  details: string[];
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiError;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
