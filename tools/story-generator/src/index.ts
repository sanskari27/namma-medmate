export interface StoryScenario<TProps extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  title: string;
  description: string;
  props: TProps;
  preloadedState?: Record<string, unknown>;
}

export function assertUniqueScenarioIds(scenarios: readonly StoryScenario[]): void {
  const seen = new Set<string>();
  for (const scenario of scenarios) {
    if (!scenario.id.trim()) {
      throw new Error('Scenario id must be a non-empty string');
    }
    if (seen.has(scenario.id)) {
      throw new Error(`Duplicate scenario id: ${scenario.id}`);
    }
    seen.add(scenario.id);
  }
}

export function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function renderGeneratedStoriesFile(options: {
  importPath: string;
  componentName: string;
  scenarios: readonly StoryScenario[];
}): string {
  assertUniqueScenarioIds(options.scenarios);
  const storyExports = options.scenarios
    .map((scenario) => {
      const exportName = toPascalCase(scenario.id);
      return `export const ${exportName}: Story = {
  name: ${JSON.stringify(scenario.title)},
  args: ${JSON.stringify(scenario.props)},
  parameters: {
    docs: { description: { story: ${JSON.stringify(scenario.description)} } },
    preloadedState: ${JSON.stringify(scenario.preloadedState ?? {})},
  },
};`;
    })
    .join('\n\n');

  return `/* eslint-disable */
/* AUTO-GENERATED FILE. DO NOT EDIT. */
import type { Meta, StoryObj } from '@storybook/react';
import { ${options.componentName} } from '${options.importPath}';

const meta = {
  title: '${options.componentName}',
  component: ${options.componentName},
} satisfies Meta<typeof ${options.componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

${storyExports}
`;
}
