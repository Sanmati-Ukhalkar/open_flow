export async function run(input: any, _config: any) {
  return {
    data: {
      body: input.body || {},
      headers: input.headers || {}
    }
  };
}
