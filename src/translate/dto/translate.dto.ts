import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsObject,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class TranslateRequestDto {
  @ApiProperty({
    description: 'Source language code (ISO 639-1)',
    example: 'en',
  })
  @IsString()
  sourceLanguage: string;

  @ApiProperty({
    description: 'Array of target language codes (ISO 639-1)',
    example: ['es', 'fr', 'pt', 'ru'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  targetLanguages: string[];

  @ApiProperty({
    description: 'Object containing key-value pairs of text to translate',
    example: { title: 'English text', description: 'Another text to translate' },
  })
  @IsObject()
  texts: Record<string, string>;
}

export class TranslateResponseDto {
  @ApiProperty({
    description: 'Translations organized by target language',
    example: {
      es: { title: 'Texto en español', description: '...' },
      fr: { title: 'Texte en français', description: '...' },
    },
  })
  translations: Record<string, Record<string, string>>;
}
