export type QueryEnvelopeResult<T> = { data: T } | { error: { status: number; data: unknown } };

interface EnvelopeExecuteResult<T> {
  data?: { data: T };
  error?: unknown;
  response?: { status: number };
}

export async function queryEnvelope<T>(
  execute: () => Promise<EnvelopeExecuteResult<T>>,
): Promise<QueryEnvelopeResult<T>> {
  try {
    const { data, error, response } = await execute();
    if (error || !data) {
      return {
        error: {
          status: response?.status ?? 500,
          data: error,
        },
      };
    }
    return { data: data.data };
  } catch {
    return { error: { status: 500, data: 'request_unavailable' } };
  }
}
