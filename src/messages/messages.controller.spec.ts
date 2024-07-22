import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from '../auth/auth.guard';
import { mockMessagesDto } from './mock-objects';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: MessagesService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [MessagesService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<MessagesController>(MessagesController);
    service = app.get<MessagesService>(MessagesService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetMessages', () => {
    it('should get messages', async () => {
      jest.spyOn(service, 'messages').mockResolvedValue(mockMessagesDto);

      expect(await service.messages({})).toBe(mockMessagesDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'messages').mockResolvedValue([]);

      expect(await service.messages({})).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'messages')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getMessages()).rejects.toThrow('Database error');
    });
  });
});
