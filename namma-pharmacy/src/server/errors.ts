export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public field?: string) {
    super(message);
  }
}

export function fail(status: number, code: string, message: string, field?: string): never {
  throw new ApiError(status, code, message, field);
}
