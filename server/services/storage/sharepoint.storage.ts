import { Client } from '@microsoft/microsoft-graph-client';
import { StorageFile, StorageService } from './storage.interface.ts';

export class SharePointStorageService implements StorageService {
  private client: Client;
  private siteId: string;
  private driveId: string;
  constructor(config: { accessToken: string; siteId: string; driveId: string }) {
    this.client  = Client.init({ authProvider: (done) => done(null, config.accessToken) });
    this.siteId  = config.siteId;
    this.driveId = config.driveId;
  }
  async upload(file: StorageFile, destinationPath: string): Promise<string> {
    const fileName = destinationPath.split('/').pop() || file.originalname;
    const res = await this.client
      .api(`/sites/${this.siteId}/drives/${this.driveId}/root:/${fileName}:/content`).put(file.buffer);
    return `sharepoint://${res.id}`;
  }
  async download(storagePath: string): Promise<Buffer> {
    const itemId = storagePath.replace('sharepoint://', '');
    const res = await this.client.api(`/sites/${this.siteId}/drives/${this.driveId}/items/${itemId}/content`).get();
    return Buffer.from(res);
  }
  async delete(storagePath: string): Promise<void> {
    const itemId = storagePath.replace('sharepoint://', '');
    await this.client.api(`/sites/${this.siteId}/drives/${this.driveId}/items/${itemId}`).delete();
  }
}