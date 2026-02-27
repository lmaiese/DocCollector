import fs from 'fs';
import path from 'path';

export interface StorageService {
  upload(file: Express.Multer.File, destinationPath: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}

export class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath: string = 'uploads') {
    this.basePath = path.resolve(process.cwd(), basePath);
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, destinationPath: string): Promise<string> {
    // destinationPath format: /Client/Year/Type/filename.ext
    const fullPath = path.join(this.basePath, destinationPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.buffer);
    return fullPath;
  }

  async download(filePath: string): Promise<Buffer> {
    // In a real scenario, this would fetch from the storage provider
    // For local, we just read the file
    // Note: filePath here is the absolute path returned by upload
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    throw new Error('File not found');
  }

  async delete(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // If file doesn't exist, we consider it deleted
  }
}

// Placeholder for Google Drive
export class GoogleDriveService implements StorageService {
  async upload(file: Express.Multer.File, destinationPath: string): Promise<string> {
    console.log(`[GoogleDrive] Uploading ${file.originalname} to ${destinationPath}`);
    // Real implementation would use googleapis drive v3
    return `gdrive://${destinationPath}`;
  }
  async download(path: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }
  async delete(path: string): Promise<void> {
    throw new Error('Not implemented');
  }
}

// Placeholder for SharePoint
export class SharePointService implements StorageService {
  async upload(file: Express.Multer.File, destinationPath: string): Promise<string> {
    console.log(`[SharePoint] Uploading ${file.originalname} to ${destinationPath}`);
    // Real implementation would use @microsoft/microsoft-graph-client
    return `sharepoint://${destinationPath}`;
  }
  async download(path: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }
  async delete(path: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
