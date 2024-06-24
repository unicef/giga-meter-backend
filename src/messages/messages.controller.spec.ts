import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('MessagesController', () => {
  let messagesController: MessagesController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [MessagesService],
      imports: [AuthGuard],
    }).compile();

    messagesController = app.get<MessagesController>(MessagesController);
  });

  it('should be defined', () => {
    expect(messagesController).toBeDefined();
  });
});
