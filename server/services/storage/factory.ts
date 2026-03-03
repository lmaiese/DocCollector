import { StorageService } from './storage.interface.ts';
import { LocalStorageService } from './local.storage.ts';
import { GoogleDriveStorageService } from './gdrive.storage.ts';
import { SharePointStorageService } from './sharepoint.storage.ts';

export function createStorageService(provider: 'local' | 'gdrive' | 'sharepoint', configJson: string): StorageService {
  const config = JSON.parse(configJson || '{}');
  switch (provider) {
    case 'gdrive':     return new GoogleDriveStorageService(config.credentials, config.folderId);
    case 'sharepoint': return new SharePointStorageService(config);
    default:           return new LocalStorageService(config.basePath || 'uploads');
  }
}