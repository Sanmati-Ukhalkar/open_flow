import { createWorker } from 'tesseract.js';

function templateString(template: string, data: any): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let value = data;
    for (const key of keys) {
      if (value === undefined || value === null) return '';
      if (value === data && value[key] === undefined && value.input !== undefined) {
        value = value.input[key];
      } else {
        value = value[key];
      }
    }
    return value !== undefined ? String(value) : '';
  });
}

export async function run(
  input: any,
  config: any
): Promise<any> {
  const { imageUrl, language = 'eng' } = config;

  if (!imageUrl) {
    throw new Error('Missing required field: imageUrl');
  }

  const finalImageUrl = templateString(imageUrl, { input });
  
  if (!finalImageUrl) {
    throw new Error('Image URL templated to an empty string');
  }

  const worker = await createWorker(language);
  try {
    const ret = await worker.recognize(finalImageUrl);
    await worker.terminate();
    return {
      text: ret.data.text,
      confidence: ret.data.confidence
    };
  } catch (error: any) {
    await worker.terminate();
    throw { code: 'OCR_ERROR', message: error.message };
  }
}
