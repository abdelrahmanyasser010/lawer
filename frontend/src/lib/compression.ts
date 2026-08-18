import imageCompression from 'browser-image-compression';

export interface CompressedResult {
  file: File;
  originalSizeKB: number;
  compressedSizeKB: number;
  compressionRatio: string;
}

/**
 * Automatically compresses image files (Vodafone Cash receipts, contract review attachments)
 * before uploading to the server to save bandwidth and ensure fast uploads.
 */
export async function compressUploadFile(file: File): Promise<CompressedResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // If not an image (e.g. PDF), return original file without compression
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      compressionRatio: '0%'
    };
  }

  const options = {
    maxSizeMB: 1, // Max 1MB after compression
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const compressedSizeKB = Math.round(compressedFile.size / 1024);
    const savedKB = originalSizeKB - compressedSizeKB;
    const ratio = originalSizeKB > 0 ? Math.round((savedKB / originalSizeKB) * 100) : 0;

    return {
      file: compressedFile,
      originalSizeKB,
      compressedSizeKB,
      compressionRatio: `${ratio > 0 ? ratio : 0}%`
    };
  } catch (error) {
    console.error('Image compression failed, falling back to original file:', error);
    return {
      file,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      compressionRatio: '0%'
    };
  }
}

/**
 * Batch compresses up to 30 attachments for Legal Consultations.
 */
export async function compressMultipleFiles(files: File[]): Promise<CompressedResult[]> {
  return Promise.all(files.map(file => compressUploadFile(file)));
}
