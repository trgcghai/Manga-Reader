import axios from 'axios'

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

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

export default axiosInstance
