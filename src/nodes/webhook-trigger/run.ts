export async function run(input: any, _config: any) {
  const body = input.body || {};
  const headers = input.headers || {};
  return {
    data: {
      body,
      headers
    },
    body,
    headers
  };
}
