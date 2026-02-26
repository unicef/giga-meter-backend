export interface StorageConfig {
  connectionString?: string;
  containerName?: string;
  localPath?: string;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export interface IStorageService {
  uploadFile(
    file: Express.Multer.File,
    path: string,
  ): Promise<UploadResult>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
}
