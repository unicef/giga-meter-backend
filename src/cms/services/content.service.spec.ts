import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SchemaValidationService } from './schema-validation.service';
import { ContentStatus } from '../dto/content.dto';
import { NotFoundException } from '@nestjs/common';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: PrismaService;
  let schemaValidationService: SchemaValidationService;

  const mockPrismaService = {
    cmsContent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSchemaValidationService = {
    buildSchemaMap: jest.fn(),
    validateContent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SchemaValidationService,
          useValue: mockSchemaValidationService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
    schemaValidationService = module.get<SchemaValidationService>(
      SchemaValidationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContent', () => {
    it('should return draft content from database', async () => {
      const mockContent = {
        id: 1,
        status: ContentStatus.DRAFT,
        contentJson: { pages: [] },
        publishedAt: null,
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.findUnique.mockResolvedValue(mockContent);

      const result = await service.getContent(ContentStatus.DRAFT);

      expect(result).toBeDefined();
      expect(result.status).toBe(ContentStatus.DRAFT);
      expect(mockPrismaService.cmsContent.findUnique).toHaveBeenCalledWith({
        where: { status: ContentStatus.DRAFT },
      });
    });

    it('should return published content from database', async () => {
      const mockContent = {
        id: 2,
        status: ContentStatus.PUBLISHED,
        contentJson: { pages: [] },
        publishedAt: new Date(),
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.findUnique.mockResolvedValue(mockContent);

      const result = await service.getContent(ContentStatus.PUBLISHED);

      expect(result).toBeDefined();
      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(mockPrismaService.cmsContent.findUnique).toHaveBeenCalledWith({
        where: { status: ContentStatus.PUBLISHED },
      });
    });

    it('should throw NotFoundException when content not found', async () => {
      mockPrismaService.cmsContent.findUnique.mockResolvedValue(null);

      await expect(
        service.getContent(ContentStatus.DRAFT),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveContent', () => {
    const mockSaveDto = {
      pages: [
        {
          page: 'home',
          sections: [
            {
              id: 'hero_1',
              schemaId: 'hero',
              data: { title: 'Welcome' },
            },
          ],
        },
      ],
    };

    it('should create new draft content', async () => {
      mockPrismaService.cmsContent.findUnique.mockResolvedValue(null);
      mockSchemaValidationService.buildSchemaMap.mockReturnValue(new Map());
      mockSchemaValidationService.validateContent.mockReturnValue(undefined);

      const mockCreatedContent = {
        id: 1,
        status: ContentStatus.DRAFT,
        contentJson: { pages: mockSaveDto.pages },
        publishedAt: null,
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.create.mockResolvedValue(
        mockCreatedContent,
      );

      const result = await service.saveContent(
        mockSaveDto,
        ContentStatus.DRAFT,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(ContentStatus.DRAFT);
      expect(mockPrismaService.cmsContent.create).toHaveBeenCalled();
    });

    it('should update existing content', async () => {
      const existingContent = {
        id: 1,
        status: ContentStatus.DRAFT,
        contentJson: { pages: [] },
        publishedAt: null,
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.findUnique.mockResolvedValue(
        existingContent,
      );
      mockSchemaValidationService.buildSchemaMap.mockReturnValue(new Map());
      mockSchemaValidationService.validateContent.mockReturnValue(undefined);

      const updatedContent = {
        ...existingContent,
        contentJson: { pages: mockSaveDto.pages },
      };

      mockPrismaService.cmsContent.update.mockResolvedValue(updatedContent);

      const result = await service.saveContent(
        mockSaveDto,
        ContentStatus.DRAFT,
      );

      expect(result.status).toBe(ContentStatus.DRAFT);
      expect(mockPrismaService.cmsContent.update).toHaveBeenCalled();
    });

    it('should set publishedAt when publishing content', async () => {
      mockPrismaService.cmsContent.findUnique.mockResolvedValue(null);
      mockSchemaValidationService.buildSchemaMap.mockReturnValue(new Map());
      mockSchemaValidationService.validateContent.mockReturnValue(undefined);

      const mockPublishedContent = {
        id: 1,
        status: ContentStatus.PUBLISHED,
        contentJson: { pages: mockSaveDto.pages },
        publishedAt: new Date(),
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.create.mockResolvedValue(
        mockPublishedContent,
      );

      const result = await service.saveContent(mockSaveDto, ContentStatus.PUBLISHED);

      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
      expect(mockPrismaService.cmsContent.create).toHaveBeenCalled();
    });
  });
});
