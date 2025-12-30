import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { TranslateRequestDto, TranslateResponseDto } from '../dto/translate.dto';

interface AzureTranslation {
  text: string;
  to: string;
}

interface AzureTranslateResponse {
  translations: AzureTranslation[];
}

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly region: string;
  private readonly apiVersion = '3.0';

  constructor(private readonly httpService: HttpService) {
    this.endpoint =
      process.env.AZURE_TRANSLATOR_ENDPOINT ||
      'https://api.cognitive.microsofttranslator.com';
    this.apiKey = process.env.AZURE_TRANSLATOR_KEY || '';
    this.region = process.env.AZURE_TRANSLATOR_REGION || '';

    if (!this.apiKey) {
      this.logger.warn(
        'AZURE_TRANSLATOR_KEY is not set. Translation service will not work.',
      );
    }
  }

  async translate(request: TranslateRequestDto): Promise<TranslateResponseDto> {
    this.validateConfiguration();

    const { sourceLanguage, targetLanguages, texts } = request;
    const textKeys = Object.keys(texts);

    if (textKeys.length === 0) {
      return { translations: {} };
    }

    const textsToTranslate = textKeys.map((key) => ({ text: texts[key] }));

    try {
      const azureResponse = await this.callAzureTranslator(
        textsToTranslate,
        sourceLanguage,
        targetLanguages,
      );

      const translations = this.transformResponse(
        azureResponse,
        textKeys,
        targetLanguages,
      );

      return { translations };
    } catch (error) {
      this.handleError(error);
    }
  }

  private validateConfiguration(): void {
    if (!this.apiKey) {
      throw new HttpException(
        'Translation service is not configured. Missing AZURE_TRANSLATOR_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async callAzureTranslator(
    texts: { text: string }[],
    from: string,
    to: string[],
  ): Promise<AzureTranslateResponse[]> {
    const url = `${this.endpoint}/translate`;
    const headers = this.buildHeaders();
    const params = this.buildParams(from, to);

    this.logger.debug(
      `Translating ${texts.length} text(s) from ${from} to ${to.join(', ')}`,
    );

    const response = await firstValueFrom(
      this.httpService.post<AzureTranslateResponse[]>(url, texts, {
        headers,
        params,
      }),
    );

    return response.data;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json',
      'X-ClientTraceId': uuidv4(),
    };

    if (this.region) {
      headers['Ocp-Apim-Subscription-Region'] = this.region;
    }

    return headers;
  }

  private buildParams(from: string, to: string[]): Record<string, string> {
    return {
      'api-version': this.apiVersion,
      from,
      to: to.join(','),
    };
  }

  private transformResponse(
    azureResponse: AzureTranslateResponse[],
    textKeys: string[],
    targetLanguages: string[],
  ): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {};

    for (const lang of targetLanguages) {
      translations[lang] = {};
    }

    azureResponse.forEach((item, index) => {
      const key = textKeys[index];
      item.translations.forEach((translation) => {
        if (translations[translation.to]) {
          translations[translation.to][key] = translation.text;
        }
      });
    });

    return translations;
  }

  private handleError(error: any): never {
    this.logger.error('Translation failed', error?.response?.data || error);

    if (error instanceof HttpException) {
      throw error;
    }

    const status = error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      error?.response?.data?.error?.message ||
      'Translation service error occurred';

    throw new HttpException(
      {
        statusCode: status,
        message,
        error: 'Translation Error',
      },
      status,
    );
  }
}
