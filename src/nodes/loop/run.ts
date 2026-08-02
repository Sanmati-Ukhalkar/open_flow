export async function run(
  input: any,
  _config: any
): Promise<any> {
  // Loop execution is entirely intercepted by engine.ts.
  // This file exists only to satisfy the standard node package format.
  return {
    results: input.results || []
  };
}
