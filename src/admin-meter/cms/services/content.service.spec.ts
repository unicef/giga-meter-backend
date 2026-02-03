import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContentStatus } from '../dto/content.dto';
import { NotFoundException } from '@nestjs/common';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    cmsContent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
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

    it('should return empty content when not found', async () => {
      mockPrismaService.cmsContent.findUnique.mockResolvedValue(null);

      const result = await service.getContent(ContentStatus.DRAFT);

      expect(result.contentJson).toBeNull();
      expect(result.status).toBe(ContentStatus.DRAFT);
    });
  });

  describe('saveContent', () => {
    const mockSaveDto = {
      contentJson: {
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
      }
    };

    it('should save draft content', async () => {
      const mockSavedContent = {
        id: 1,
        status: ContentStatus.DRAFT,
        contentJson: mockSaveDto.contentJson,
        publishedAt: null,
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.upsert.mockResolvedValue(mockSavedContent);

      const result = await service.saveContent(
        mockSaveDto,
        ContentStatus.DRAFT,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(ContentStatus.DRAFT);
      expect(mockPrismaService.cmsContent.upsert).toHaveBeenCalled();
    });

    it('should delete draft when publishing', async () => {
      const mockPublishedContent = {
        id: 1,
        status: ContentStatus.PUBLISHED,
        contentJson: mockSaveDto.contentJson,
        publishedAt: new Date(),
        lastModified: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.cmsContent.upsert.mockResolvedValue(mockPublishedContent);

      await service.saveContent(mockSaveDto, ContentStatus.PUBLISHED);

      expect(mockPrismaService.cmsContent.deleteMany).toHaveBeenCalledWith({
        where: { status: ContentStatus.DRAFT },
      });
    });
  });
});
