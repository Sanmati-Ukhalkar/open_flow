export async function run(input: any, config: { operation: string; value: string }) {
  const val = Number(config.value || 0);
  const num = Number(input.data || input.text || input || 0);
  let res = num;
  if (config.operation === 'add') res += val;
  else if (config.operation === 'sub') res -= val;
  else if (config.operation === 'mul') res *= val;
  else if (config.operation === 'div') res /= val;
  return { result: res };
}
