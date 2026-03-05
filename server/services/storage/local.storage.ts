import fs from 'fs';
import path from 'path';
import { StorageFile, StorageService } from './storage.interface.ts';
import { encryptionService } from '../encryption.service.ts';

export class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath = 'uploads') {
    this.basePath = path.resolve(process.cwd(), basePath);
    fs.mkdirSync(this.basePath, { recursive: true });
  }

  async upload(file: StorageFile, destinationPath: string): Promise<string> {
    const fullPath = path.join(this.basePath, destinationPath) + '.enc';
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const payload = encryptionService.encrypt(file.buffer);
    fs.writeFileSync(fullPath, encryptionService.serialize(payload));
    return fullPath;
  }

  async download(storagePath: string): Promise<Buffer> {
    if (!fs.existsSync(storagePath)) throw new Error('File not found: ' + storagePath);
    const raw = fs.readFileSync(storagePath);
    return encryptionService.decrypt(encryptionService.deserialize(raw));
  }

  async delete(storagePath: string): Promise<void> {
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
  }
}