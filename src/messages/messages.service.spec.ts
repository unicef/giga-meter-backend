import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockMessagesDto, mockMessagesModel } from './mock-objects';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagesService, PrismaService],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Messages', () => {
    it('should return messages', async () => {
      jest
        .spyOn(prisma.dailycheckapp_contact_contactmessage, 'findMany')
        .mockResolvedValue(mockMessagesModel);

      const messages = await service.messages({});
      expect(messages).toEqual(mockMessagesDto);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_contact_contactmessage, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.messages({})).rejects.toThrowError('Database error');
    });

    it('should handle empty result set', async () => {
      jest
        .spyOn(prisma.dailycheckapp_contact_contactmessage, 'findMany')
        .mockResolvedValue([]);

      const messages = await service.messages({});
      expect(messages).toEqual([]);
    });
  });
});
