import { google } from 'googleapis';
import { Readable } from 'stream';
import { StorageFile, StorageService } from './storage.interface.ts';

export class GoogleDriveStorageService implements StorageService {
  private drive: any;
  private folderId?: string;
  constructor(credentials: { client_email: string; private_key: string }, folderId?: string) {
    const auth = new google.auth.JWT(credentials.client_email, undefined, credentials.private_key,
      ['https://www.googleapis.com/auth/drive']);
    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = folderId;
  }
  async upload(file: StorageFile, destinationPath: string): Promise<string> {
    const fileName = destinationPath.split('/').pop() || file.originalname;
    const res = await this.drive.files.create({
      requestBody: { name: fileName, parents: this.folderId ? [this.folderId] : undefined },
      media: { mimeType: file.mimetype, body: Readable.from(file.buffer) },
      fields: 'id',
    });
    return `gdrive://${res.data.id}`;
  }
  async download(storagePath: string): Promise<Buffer> {
    const res = await this.drive.files.get(
      { fileId: storagePath.replace('gdrive://', ''), alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data);
  }
  async delete(storagePath: string): Promise<void> {
    await this.drive.files.delete({ fileId: storagePath.replace('gdrive://', '') });
  }
}