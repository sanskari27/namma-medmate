import { describe, expect, it } from 'vitest';
import {
  assertUniqueScenarioIds,
  renderGeneratedStoriesFile,
  toPascalCase,
} from '../../src/index.ts';

describe('story-generator', () => {
  it('rejects duplicate ids and empty ids', () => {
    expect(() =>
      assertUniqueScenarioIds([
        { id: 'a', title: 'A', description: '', props: {} },
        { id: 'a', title: 'B', description: '', props: {} },
      ]),
    ).toThrow('Duplicate scenario id');
    expect(() =>
      assertUniqueScenarioIds([{ id: ' ', title: 'A', description: '', props: {} }]),
    ).toThrow('non-empty');
  });

  it('renders a generated stories file', () => {
    const source = renderGeneratedStoriesFile({
      importPath: '../../src/index.ts',
      componentName: 'AuthWidget',
      scenarios: [
        {
          id: 'loading',
          title: 'Loading',
          description: 'in progress',
          props: { title: 'Session' },
          preloadedState: { session: { status: 'loading' } },
        },
      ],
    });
    expect(toPascalCase('service-failure')).toBe('ServiceFailure');
    expect(source).toContain('export const Loading');
    expect(source).toContain('AUTO-GENERATED FILE');
  });
});
