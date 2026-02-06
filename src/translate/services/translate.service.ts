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
  private readonly useDevTranslator: boolean;
  private readonly gigaMapsBackendUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.endpoint =
      process.env.AZURE_TRANSLATOR_ENDPOINT ||
      'https://api.cognitive.microsofttranslator.com';
    this.apiKey = process.env.AZURE_TRANSLATOR_KEY || '';
    this.region = process.env.AZURE_TRANSLATOR_REGION || '';
    this.useDevTranslator = process.env.USE_DEV_TRANSLATOR === 'true';
    this.gigaMapsBackendUrl =
      process.env.GIGA_MAPS_BACKEND_URL ||
      'https://uni-ooi-giga-maps-backend-dev.azurewebsites.net';

    if (!this.apiKey && !this.useDevTranslator) {
      this.logger.warn(
        'AZURE_TRANSLATOR_KEY is not set. Translation service will not work.',
      );
    }

    if (this.useDevTranslator) {
      this.logger.log(
        `Dev translator mode enabled. Using: ${this.gigaMapsBackendUrl}`,
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
    if (!this.apiKey && !this.useDevTranslator) {
      throw new HttpException(
        'Translation service is not configured. Missing AZURE_TRANSLATOR_KEY or USE_DEV_TRANSLATOR.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async callAzureTranslator(
    texts: { text: string }[],
    from: string,
    to: string[],
  ): Promise<AzureTranslateResponse[]> {
    // Use dev API endpoint if configured
    if (this.useDevTranslator || !this.apiKey) {
      return this.callDevTranslator(texts, to);
    }

    // Original Azure Translator implementation
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

  private async callDevTranslator(
    texts: { text: string }[],
    targetLanguages: string[],
  ): Promise<AzureTranslateResponse[]> {
    const devBaseUrl = `${this.gigaMapsBackendUrl}/api/accounts/translate/text`;

    this.logger.debug(
      `Using dev API: Translating ${texts.length} text(s) to ${targetLanguages.join(', ')}`,
    );

    // The dev API only supports one language at a time, so we need to make multiple requests
    const allTranslations: AzureTranslateResponse[] = texts.map(() => ({
      translations: [],
    }));

    for (const targetLang of targetLanguages) {
      const url = `${devBaseUrl}/${targetLang}/`;

      try {
        const response = await firstValueFrom(
          this.httpService.put<AzureTranslateResponse[]>(url, texts, {
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );

        // Merge translations for this language into the result
        response.data.forEach((item, index) => {
          allTranslations[index].translations.push(...item.translations);
        });
      } catch (error) {
        this.logger.warn(
          `Failed to translate to ${targetLang} using dev API. Using original English text as fallback.`,
          error?.response?.data || error,
        );

        // Fallback: Use original English text when translation fails
        texts.forEach((textItem, index) => {
          allTranslations[index].translations.push({
            text: textItem.text,
            to: targetLang,
          });
        });
      }
    }

    return allTranslations;
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
