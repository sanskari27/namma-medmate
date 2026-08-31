export interface HttpClientOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createHttpClient(options: HttpClientOptions = {}) {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 50;
  const fetchImpl = options.fetchImpl ?? fetch;

  return async function request(input: string | URL, init: RequestInit = {}): Promise<Response> {
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(input, { ...init, signal: controller.signal });
        if (response.status >= 500 && attempt < retries) {
          attempt += 1;
          await wait(retryDelayMs * attempt);
          continue;
        }
        if (!response.ok) {
          throw new HttpClientError(`Request failed with ${response.status}`, response.status);
        }
        return response;
      } catch (error) {
        if (error instanceof HttpClientError) {
          throw error;
        }
        if (attempt >= retries) {
          throw new HttpClientError('Request failed after retries');
        }
        attempt += 1;
        await wait(retryDelayMs * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}
