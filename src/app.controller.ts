import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { dailycheckapp_contact_contactmessage as MessageModel } from '@prisma/client';
import { MessageService } from './services/message/message.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('messages')
  async getMessages(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<MessageModel[]> {
    return this.messageService.messages({
      skip: parseInt(skip) ?? 0,
      take: parseInt(take) ?? 10,
    });
  }
}
