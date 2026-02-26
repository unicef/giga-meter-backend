import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TranslateService } from '../services/translate.service';
import { TranslateRequestDto, TranslateResponseDto } from '../dto/translate.dto';
import { Public } from '../../common/public.decorator';
import { ApiExcludeController } from '@nestjs/swagger';
import { AdminAccess } from 'src/common/admin.decorator';

@ApiTags('Translation')
@Controller('api/v1/translate')
@ApiExcludeController()
@AdminAccess()
export class TranslateController {
  private readonly logger = new Logger(TranslateController.name);

  constructor(private readonly translateService: TranslateService) { }

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Translate text to multiple languages',
    description:
      'Translate text content from a source language to multiple target languages using Azure AI Translator.',
  })
  @ApiBody({ type: TranslateRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Translation completed successfully',
    type: TranslateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: 503,
    description: 'Translation service unavailable',
  })
  async translate(
    @Body() translateDto: TranslateRequestDto,
  ): Promise<TranslateResponseDto> {
    this.logger.log(
      `Translating from ${translateDto.sourceLanguage} to ${translateDto.targetLanguages.join(', ')}`,
    );

    return this.translateService.translate(translateDto);
  }
}
