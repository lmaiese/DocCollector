import { StorageService } from './storage.interface.js';
import { LocalStorageService } from './local.storage.js';
import { GoogleDriveStorageService } from './gdrive.storage.js';
import { SharePointStorageService } from './sharepoint.storage.js';

export function createStorageService(provider: 'local' | 'gdrive' | 'sharepoint', configJson: string): StorageService {
  const config = JSON.parse(configJson || '{}');
  switch (provider) {
    case 'gdrive':     return new GoogleDriveStorageService(config.credentials, config.folderId);
    case 'sharepoint': return new SharePointStorageService(config);
    default:           return new LocalStorageService(config.basePath || 'uploads');
  }
}