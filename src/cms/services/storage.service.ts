import { Injectable, Logger } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageService, UploadResult } from '../interfaces/storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private containerClient: ContainerClient | null = null;
  private useAzure = false;
  private localStoragePath: string;

  constructor() {
    this.localStoragePath = path.join(process.cwd(), 'content', 'media');
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.logger.debug('connection string', connectionString);
    const containerName =
      process.env.AZURE_STORAGE_CONTAINER || 'giga-meter-cms-media';

    if (connectionString && connectionString.trim() !== '') {
      try {
        const blobServiceClient =
          BlobServiceClient.fromConnectionString(connectionString);
        this.containerClient =
          blobServiceClient.getContainerClient(containerName);

        // Create container if it doesn't exist
        // await this.containerClient.createIfNotExists({
        //   access: 'blob', // Public access for blobs
        // });

        this.useAzure = true;
        this.logger.log(
          `Azure Blob Storage initialized successfully. Container: ${containerName}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to initialize Azure Blob Storage: ${error.message}. Falling back to local storage.`,
        );
        this.useAzure = false;
      }
    } else {
      this.logger.log(
        'Azure Storage connection string not found. Using local storage.',
      );
      this.useAzure = false;
    }

    // Ensure local storage directory exists
    if (!this.useAzure) {
      await this.ensureLocalDirectory(this.localStoragePath);
    }
  }

  private async ensureLocalDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.log(`Created local storage directory: ${dirPath}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    filePath: string,
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.originalname}`;
    const fullPath = path.join(filePath, filename);

    if (this.useAzure && this.containerClient) {
      return this.uploadToAzure(file, fullPath);
    } else {
      return this.uploadToLocal(file, fullPath);
    }
  }

  private async uploadToAzure(
    file: Express.Multer.File,
    filePath: string,
  ): Promise<UploadResult> {
    try {
      const blockBlobClient = this.containerClient!.getBlockBlobClient(filePath);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      const url = blockBlobClient.url;

      this.logger.log(`File uploaded to Azure: ${filePath}`);

      return {
        url,
        path: filePath,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload to Azure: ${error.message}`);
      // Fallback to local storage
      this.logger.log('Falling back to local storage for this upload');
      return this.uploadToLocal(file, filePath);
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    filePath: string,
  ): Promise<UploadResult> {
    const fullPath = path.join(this.localStoragePath, filePath);
    const directory = path.dirname(fullPath);

    await this.ensureLocalDirectory(directory);
    await fs.writeFile(fullPath, file.buffer);

    this.logger.log(`File uploaded locally: ${fullPath}`);

    // Return relative URL for local files
    const url = `/content/media/${filePath}`;

    return {
      url,
      path: filePath,
      size: file.size,
      contentType: file.mimetype,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.useAzure && this.containerClient) {
      await this.deleteFromAzure(filePath);
    } else {
      await this.deleteFromLocal(filePath);
    }
  }

  private async deleteFromAzure(filePath: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient!.getBlockBlobClient(filePath);
      await blockBlobClient.deleteIfExists();
      this.logger.log(`File deleted from Azure: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete from Azure: ${error.message}`);
    }
  }

  private async deleteFromLocal(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.localStoragePath, filePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted locally: ${fullPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Failed to delete local file: ${error.message}`);
      }
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    if (this.useAzure && this.containerClient) {
      const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);
      return blockBlobClient.url;
    } else {
      return `/content/media/${filePath}`;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    if (this.useAzure && this.containerClient) {
      try {
        const blockBlobClient =
          this.containerClient.getBlockBlobClient(filePath);
        return await blockBlobClient.exists();
      } catch {
        return false;
      }
    } else {
      try {
        const fullPath = path.join(this.localStoragePath, filePath);
        await fs.access(fullPath);
        return true;
      } catch {
        return false;
      }
    }
  }

  isUsingAzure(): boolean {
    return this.useAzure;
  }
}
