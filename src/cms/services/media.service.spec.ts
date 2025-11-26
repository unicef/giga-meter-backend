import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MediaService', () => {
  let service: MediaService;
  let prismaService: PrismaService;
  let storageService: StorageService;

  const mockPrismaService = {
    cmsMedia: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prismaService = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaLibrary', () => {
    it('should return media library with all file types', async () => {
      const mockMedia = [
        {
          id: 'file_1',
          name: 'Test Image.jpg',
          altText: 'Test Image',
          fileType: 'image/jpeg',
          fileSize: 1024,
          filePath: '/content/media/test.jpg',
          url: 'https://example.com/test.jpg',
          width: 1920,
          height: 1080,
          duration: null,
          uploadedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'file_2',
          name: 'Test Video.mp4',
          altText: null,
          fileType: 'video/mp4',
          fileSize: 5000000,
          filePath: '/content/media/test.mp4',
          url: 'https://example.com/test.mp4',
          width: 1920,
          height: 1080,
          duration: 120,
          uploadedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'file_3',
          name: 'Test Document.pdf',
          altText: null,
          fileType: 'application/pdf',
          fileSize: 2048,
          filePath: '/content/media/test.pdf',
          url: 'https://example.com/test.pdf',
          width: null,
          height: null,
          duration: null,
          uploadedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockPrismaService.cmsMedia.findMany.mockResolvedValue(mockMedia);

      const result = await service.getMediaLibrary();

      expect(result.files).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.files[0].fileType).toBe('image/jpeg');
      expect(result.files[1].fileType).toBe('video/mp4');
      expect(result.files[2].fileType).toBe('application/pdf');
    });
  });

  describe('uploadFile', () => {
    const mockImageFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 500, // 500KB
      buffer: Buffer.from('test'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockVideoFile: Express.Multer.File = {
      ...mockImageFile,
      originalname: 'test.mp4',
      mimetype: 'video/mp4',
      size: 5 * 1024 * 1024, // 5MB
    };

    const mockDocFile: Express.Multer.File = {
      ...mockImageFile,
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 2 * 1024 * 1024, // 2MB
    };

    it('should upload image file', async () => {
      const mockCreatedMedia = {
        id: 'file_123',
        name: 'test.jpg',
        altText: '',
        fileType: 'image/jpeg',
        fileSize: mockImageFile.size,
        filePath: '/content/media/file_123_test.jpg',
        url: 'https://example.com/file_123_test.jpg',
        width: 1920,
        height: 1080,
        duration: null,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.cmsMedia.create.mockResolvedValue(mockCreatedMedia);

      const result = await service.uploadFile(mockImageFile);

      expect(result).toBeDefined();
      expect(result.name).toBe('test.jpg');
      expect(result.fileType).toBe('image/jpeg');
      expect(mockPrismaService.cmsMedia.create).toHaveBeenCalled();
    });

    it('should upload video file', async () => {
      const mockCreatedMedia = {
        id: 'file_456',
        name: 'test.mp4',
        altText: '',
        fileType: 'video/mp4',
        fileSize: mockVideoFile.size,
        filePath: '/content/media/file_456_test.mp4',
        url: 'https://example.com/file_456_test.mp4',
        width: 1920,
        height: 1080,
        duration: 120,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.cmsMedia.create.mockResolvedValue(mockCreatedMedia);

      const result = await service.uploadFile(mockVideoFile);

      expect(result).toBeDefined();
      expect(result.name).toBe('test.mp4');
      expect(result.fileType).toBe('video/mp4');
    });

    it('should upload document file', async () => {
      const mockCreatedMedia = {
        id: 'file_789',
        name: 'test.pdf',
        altText: '',
        fileType: 'application/pdf',
        fileSize: mockDocFile.size,
        filePath: '/content/media/file_789_test.pdf',
        url: 'https://example.com/file_789_test.pdf',
        width: null,
        height: null,
        duration: null,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.cmsMedia.create.mockResolvedValue(mockCreatedMedia);

      const result = await service.uploadFile(mockDocFile);

      expect(result).toBeDefined();
      expect(result.name).toBe('test.pdf');
      expect(result.fileType).toBe('application/pdf');
    });

    it('should throw error for image size exceeding 10MB limit', async () => {
      const largeImageFile = {
        ...mockImageFile,
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(service.uploadFile(largeImageFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for video size exceeding 100MB limit', async () => {
      const largeVideoFile = {
        ...mockVideoFile,
        size: 101 * 1024 * 1024, // 101MB
      };

      await expect(service.uploadFile(largeVideoFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for document size exceeding 20MB limit', async () => {
      const largeDocFile = {
        ...mockDocFile,
        size: 21 * 1024 * 1024, // 21MB
      };

      await expect(service.uploadFile(largeDocFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for unsupported file type', async () => {
      const invalidFile = {
        ...mockImageFile,
        mimetype: 'application/x-exe',
        originalname: 'virus.exe',
      };

      await expect(service.uploadFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateFileMetadata', () => {
    it('should update file metadata', async () => {
      const mockMedia = {
        id: 'file_1',
        name: 'Old Name.jpg',
        altText: 'Old Alt',
        fileType: 'image/jpeg',
        fileSize: 1024,
        filePath: '/content/media/old.jpg',
        url: 'https://example.com/old.jpg',
        width: 1920,
        height: 1080,
        duration: null,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      const updatedMedia = {
        ...mockMedia,
        name: 'New Name.jpg',
        altText: 'New Alt',
      };

      mockPrismaService.cmsMedia.findUnique.mockResolvedValue(mockMedia);
      mockPrismaService.cmsMedia.update.mockResolvedValue(updatedMedia);

      const result = await service.updateFileMetadata({
        id: 'file_1',
        name: 'New Name.jpg',
        altText: 'New Alt',
      });

      expect(result.name).toBe('New Name.jpg');
      expect(result.altText).toBe('New Alt');
    });

    it('should throw NotFoundException for non-existent file', async () => {
      mockPrismaService.cmsMedia.findUnique.mockResolvedValue(null);

      await expect(
        service.updateFileMetadata({
          id: 'non_existent',
          name: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const mockMedia = {
        id: 'file_1',
        name: 'Test.jpg',
        filePath: '/content/media/test.jpg',
        isDeleted: false,
      };

      mockPrismaService.cmsMedia.findUnique.mockResolvedValue(mockMedia);
      mockPrismaService.cmsMedia.delete.mockResolvedValue(mockMedia);
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      await service.deleteFile('file_1');

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        '/content/media/test.jpg',
      );
      expect(mockPrismaService.cmsMedia.delete).toHaveBeenCalledWith({
        where: { id: 'file_1' },
      });
    });

    it('should throw error if file is used in sections', async () => {
      const mockMedia = {
        id: 'file_1',
        name: 'Test.jpg',
        filePath: '/content/media/test.jpg',
      };

      mockPrismaService.cmsMedia.findUnique.mockResolvedValue(mockMedia);

      await expect(service.deleteFile('file_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent file', async () => {
      mockPrismaService.cmsMedia.findUnique.mockResolvedValue(null);

      await expect(service.deleteFile('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
