import vm from 'vm';

export async function run(
  input: any,
  config: any
): Promise<any> {
  const { code } = config;

  if (!code) {
    throw new Error('Missing required field: code');
  }

  try {
    const sandbox = {
      input: JSON.parse(JSON.stringify(input)),
      console: console
    };

    const script = new vm.Script(`
      (function() {
        ${code}
      })()
    `);

    const context = vm.createContext(sandbox);
    const result = script.runInContext(context, { timeout: 1000 });
    return result;
  } catch (error: any) {
    throw { code: 'SANDBOX_EXECUTION_ERROR', message: error.message };
  }
}
