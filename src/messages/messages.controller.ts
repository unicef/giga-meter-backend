import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { MessagesDto } from './messages.dto';

@ApiTags('Contact Messages')
@Controller('api/v1/messages')
export class MessagesController {
  constructor(private readonly msgsService: MessagesService) {}

  @Get('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of contact messages on the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of contact messages',
    type: MessagesDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of contact messages to return, default: 10',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description:
      'The number of pages to skip before starting to collect the result, eg: if page=2 and size=10, it will skip 20 (2*10) records, default: 0',
    required: false,
    type: 'number',
  })
  async getMessages(
    @Query('page') page?: number,
    @Query('size') size?: number,
  ): Promise<ApiSuccessResponseDto<MessagesDto[]>> {
    try {
      const messages = await this.msgsService.messages({
        skip: (page ?? 0) * (size ?? 10),
        take: (size ?? 10) * 1,
      });

      return {
        success: true,
        data: messages,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get messages with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
