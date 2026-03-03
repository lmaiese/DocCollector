export interface StorageFile { buffer: Buffer; originalname: string; mimetype: string; size: number; }
export interface StorageService {
  upload(file: StorageFile, destinationPath: string): Promise<string>;
  download(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}