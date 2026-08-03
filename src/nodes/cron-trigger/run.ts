export async function run(_input: any, config: { cronExpression: string }) {
  const triggeredAt = new Date().toISOString();
  const cronPattern = config.cronExpression || '*/5 * * * *';
  return {
    data: {
      triggeredAt,
      cronPattern
    },
    triggeredAt,
    cronPattern
  };
}
