export interface TokenFixture {
  name: string;
  token: string;
}

export function selectToken(fixtures: readonly TokenFixture[], name: string): string {
  const match = fixtures.find((fixture) => fixture.name === name);
  if (!match) {
    throw new Error(`Unknown token fixture: ${name}`);
  }
  return match.token;
}
