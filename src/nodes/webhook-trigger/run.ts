export async function run(input: any, _config: any) {
  return {
    body: input.body || {},
    headers: input.headers || {}
  };
}
