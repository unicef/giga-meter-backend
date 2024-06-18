import { Controller, Get, Query } from '@nestjs/common';
import { dailycheckapp_contact_contactmessage as MessageModel } from '@prisma/client';
import { MessagesService } from './messages.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('messages')
@Controller('messages')
@Controller()
export class MessagesController {
  constructor(private readonly MessagesService: MessagesService) {}

  @Get('')
  @ApiOperation({ summary: 'Get all contact messages' })
  async getMessages(
    @Query('skip') skip = 0,
    @Query('take') take = 10,
  ): Promise<MessageModel[]> {
    return this.MessagesService.messages({
      skip,
      take,
    });
  }
}
