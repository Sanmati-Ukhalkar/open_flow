export async function run(input: any, _config: any) {
  return {
    filePath: input.filePath || '',
    fileName: input.fileName || '',
    eventType: input.eventType || ''
  };
}
