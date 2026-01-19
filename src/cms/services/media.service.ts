import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';
import * as sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  UpdateFileMetadataDto,
  MediaResponseDto,
  MediaLibraryResponseDto,
} from '../dto/media.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly mediaJsonPath: string;
  
  // File size limits per type
  private readonly maxFileSizes = {
    image: 10 * 1024 * 1024, // 10MB for images
    video: 100 * 1024 * 1024, // 100MB for videos
    document: 20 * 1024 * 1024, // 20MB for documents
  };
  
  // Allowed MIME types
  private readonly allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    // Documents
    'application/pdf',
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {
    this.mediaJsonPath = path.join(
      process.cwd(),
      '.storage',
      'media',
      'media.json',
    );
    this.initializeMediaJson();
  }

  private async initializeMediaJson(): Promise<void> {
    try {
      await fs.access(this.mediaJsonPath);
    } catch {
      const dir = path.dirname(this.mediaJsonPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.mediaJsonPath,
        JSON.stringify({ images: [] }, null, 2),
      );
      this.logger.log('Initialized media.json');
    }
  }

  /**
   * Get media library
   */
  async getMediaLibrary(): Promise<MediaLibraryResponseDto> {
    try {
      const media = await this.prisma.cmsMedia.findMany({
        where: { 
          deletedAt: {
            
          }
        },
        orderBy: { uploadedAt: 'desc' },
      });

      const files = await Promise.all(
        media.map((m) => this.mapToMediaResponse(m)),
      );

      return {
        files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get media library: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload file (image, video, or document)
   */
  async uploadFile(file: Express.Multer.File, name?: string): Promise<MediaResponseDto> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate file ID
      const fileId = this.generateFileId();

      // Process file based on type
      let processedFile = file;
      let metadata: any = {};

      if (this.isImage(file.mimetype)) {
        // Process and optimize image
        const result = await this.processImage(file);
        processedFile = result.file;
        metadata = result.metadata;
      } else if (this.isVideo(file.mimetype)) {
        // For videos, we could extract metadata here
        // For now, just use the file as-is
        metadata = { duration: null };
      }

      // Determine file path
      const filePath = `${fileId}_${file.originalname}`;

      // Upload file to storage
      const uploadResult = await this.storageService.uploadFile(
        processedFile,
        filePath,
      );

      // Get file URL
      const url = await this.storageService.getFileUrl(uploadResult.path);

      // Create media record
      const media = await this.prisma.cmsMedia.create({
        data: {
          id: fileId,
          name: name || file.originalname,
          fileType: processedFile.mimetype,
          fileSize: processedFile.size,
          filePath: uploadResult.path,
          url,
          width: metadata.width,
          height: metadata.height,
          duration: metadata.duration,
        },
      });

      this.logger.log(`Uploaded file: ${fileId} - ${file.originalname}`);

      // Update media.json
      await this.updateMediaJson();

      return this.mapToMediaResponse(media);
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    dto: UpdateFileMetadataDto,
  ): Promise<MediaResponseDto> {
    try {
      const media = await this.prisma.cmsMedia.findUnique({
        where: { id: dto.id },
      });

      if (!media) {
        throw new NotFoundException(`File with ID ${dto.id} not found`);
      }

      const updatedMedia = await this.prisma.cmsMedia.update({
        where: { id: dto.id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.altText !== undefined && { altText: dto.altText }),
        },
      });

      this.logger.log(`Updated metadata for file: ${dto.id}`);

      // Update media.json
      await this.updateMediaJson();

      return this.mapToMediaResponse(updatedMedia);
    } catch (error) {
      this.logger.error(`Failed to update file metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(id: string): Promise<void> {
    try {
      const media = await this.prisma.cmsMedia.findUnique({
        where: { id },
      });

      if (!media) {
        throw new NotFoundException(`File with ID ${id} not found`);
      }

      // Delete file from storage
      await this.storageService.deleteFile(media.filePath);

      // Soft delete in database
      await this.prisma.cmsMedia.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Deleted file: ${id}`);

      // Update media.json
      await this.updateMediaJson();
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed.`,
      );
    }

    // Check file size based on type
    const fileType = this.getFileType(file.mimetype);
    const maxSize = this.maxFileSizes[fileType];

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB for ${fileType}s`,
      );
    }
  }

  /**
   * Get file type category
   */
  private getFileType(mimeType: string): 'image' | 'video' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  }

  /**
   * Check if file is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  private isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Process image (optimize and extract metadata)
   */
  private async processImage(
    file: Express.Multer.File,
  ): Promise<{ file: Express.Multer.File; metadata: any }> {
    const shouldOptimize = process.env.IMAGE_OPTIMIZE === 'true';

    try {
      let sharpInstance = sharp(file.buffer);

      // Get metadata
      const metadata = await sharpInstance.metadata();

      if (!shouldOptimize || file.mimetype === 'image/svg+xml') {
        return {
          file,
          metadata: {
            width: metadata.width,
            height: metadata.height,
          },
        };
      }

      // Optimize: resize if too large and convert to WebP
      const maxDimension = 2560; // Max width or height

      if (
        metadata.width &&
        metadata.height &&
        (metadata.width > maxDimension || metadata.height > maxDimension)
      ) {
        sharpInstance = sharpInstance.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to WebP for better compression
      sharpInstance = sharpInstance.webp({ quality: 85 });
      const buffer = await sharpInstance.toBuffer();
      const newMetadata = await sharp(buffer).metadata();

      return {
        file: {
          ...file,
          buffer,
          size: buffer.length,
          mimetype: 'image/webp',
          originalname: file.originalname.replace(/\.[^.]+$/, '.webp'),
        },
        metadata: {
          width: newMetadata.width,
          height: newMetadata.height,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Failed to optimize image: ${error.message}. Using original.`,
      );
      
      // Return original with basic metadata
      try {
        const metadata = await sharp(file.buffer).metadata();
        return {
          file,
          metadata: {
            width: metadata.width,
            height: metadata.height,
          },
        };
      } catch {
        return {
          file,
          metadata: { width: null, height: null },
        };
      }
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}`;
  }

  /**
   * Map database record to response DTO
   */
  private async mapToMediaResponse(media: any): Promise<MediaResponseDto> {
    // Get URL if not already set
    const url = media.url || (await this.storageService.getFileUrl(media.filePath));

    return {
      id: media.id,
      name: media.name,
      altText: media.altText,
      fileType: media.fileType,
      fileSize: media.fileSize,
      filePath: media.filePath,
      url,
      width: media.width,
      height: media.height,
      duration: media.duration,
      uploadedAt: media.uploadedAt,
    };
  }

  /**
   * Update media.json file
   */
  private async updateMediaJson(): Promise<void> {
    try {
      const library = await this.getMediaLibrary();
      await fs.writeFile(
        this.mediaJsonPath,
        JSON.stringify(library, null, 2),
      );
      this.logger.debug('Updated media.json');
    } catch (error) {
      this.logger.error(`Failed to update media.json: ${error.message}`);
    }
  }
}
