import vm from 'vm';

export async function run(
  input: any,
  config: any
): Promise<any> {
  const { condition } = config;

  if (!condition) {
    throw new Error('Missing required field: condition');
  }

  try {
    const sandbox = {
      input: JSON.parse(JSON.stringify(input))
    };

    const script = new vm.Script(`!!(${condition})`);
    const context = vm.createContext(sandbox);
    
    const result = script.runInContext(context, { timeout: 500 });
    
    const takenEdge = result ? 'true' : 'false';
    return {
      data: {
        takenEdge,
        result
      },
      takenEdge,
      result
    };
  } catch (error: any) {
    throw { code: 'BRANCH_EVAL_ERROR', message: error.message };
  }
}
