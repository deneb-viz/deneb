/**
 * Convert a raw file into a blob.
 */
export const getWorkerAsBlobFromRawFile = (rawFile: string) =>
  new Blob([rawFile], { type: "application/javascript" });

/**
 * Convert a blob into a URL.
 */
export const getUrlFromBlob = (blob: Blob) => URL.createObjectURL(blob);

/**
 * Create a new worker from a URL.
 */
export const getWorkerFromUrl = (url: string, options: WorkerOptions = {}) =>
  new Worker(url, options);
