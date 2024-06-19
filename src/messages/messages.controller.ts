import { Controller, Get, Query } from '@nestjs/common';
import { dailycheckapp_contact_contactmessage as MessageModel } from '@prisma/client';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('api/v1/messages')
export class MessagesController {
  constructor(private readonly msgsService: MessagesService) {}

  @Get('')
  @ApiOperation({
    summary:
      'Returns the list of contact messages on the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of contact messages',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of contact messages to return',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description:
      'The number of pages to skip before starting to collect the result, eg: if page=2 and size=10, it will skip 20 (2*10) records',
    required: false,
    type: 'number',
  })
  async getMessages(
    @Query('page') page?: number,
    @Query('size') size?: number,
  ): Promise<MessageModel[]> {
    return this.msgsService.messages({
      skip: (page ?? 0) * (size ?? 10),
      take: (size ?? 10) * 1,
    });
  }
}
