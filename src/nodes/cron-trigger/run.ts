export async function run(_input: any, config: { cronExpression: string }) {
  return {
    data: {
      triggeredAt: new Date().toISOString(),
      cronPattern: config.cronExpression || '*/5 * * * *'
    }
  };
}
