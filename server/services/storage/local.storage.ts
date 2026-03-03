import fs from 'fs';
import path from 'path';
import { StorageFile, StorageService } from './storage.interface.ts';

export class LocalStorageService implements StorageService {
  private basePath: string;
  constructor(basePath = 'uploads') {
    this.basePath = path.resolve(process.cwd(), basePath);
    fs.mkdirSync(this.basePath, { recursive: true });
  }
  async upload(file: StorageFile, destinationPath: string): Promise<string> {
    const fullPath = path.join(this.basePath, destinationPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.buffer);
    return fullPath;
  }
  async download(storagePath: string): Promise<Buffer> {
    if (!fs.existsSync(storagePath)) throw new Error('File not found: ' + storagePath);
    return fs.readFileSync(storagePath);
  }
  async delete(storagePath: string): Promise<void> {
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
  }
}