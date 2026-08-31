export interface Span {
  name: string;
  attributes: Record<string, string | number | boolean>;
  end: () => void;
}

export function startSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {},
): Span {
  const started = Date.now();
  return {
    name,
    attributes,
    end: () => {
      attributes.durationMs = Date.now() - started;
    },
  };
}
