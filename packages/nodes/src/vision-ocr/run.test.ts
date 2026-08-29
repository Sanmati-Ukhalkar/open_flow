import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

const mockRecognize = vi.fn();
const mockTerminate = vi.fn();

vi.mock('tesseract.js', () => {
  return {
    createWorker: vi.fn().mockImplementation(() => {
      return {
        recognize: mockRecognize,
        terminate: mockTerminate,
      };
    }),
  };
});

describe('Vision OCR Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully run recognize and return text and confidence', async () => {
    mockRecognize.mockResolvedValue({
      data: {
        text: 'Detected OCR text content',
        confidence: 95.5,
      },
    });

    const config = {
      imageUrl: 'https://example.com/image.png',
      language: 'eng',
    };

    const result = await run({}, config);

    expect(result).toEqual({
      text: 'Detected OCR text content',
      confidence: 95.5,
    });

    expect(mockRecognize).toHaveBeenCalledWith('https://example.com/image.png');
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('should throw an error if imageUrl is missing', async () => {
    await expect(run({}, { imageUrl: '' })).rejects.toThrow('Missing required field: imageUrl');
  });
});
