export class ValidateApiKeyDto {
  readonly success: boolean;
  readonly timestamp: string;
  readonly data: ValidateKeyDto;
}

class ValidateKeyDto {
  readonly has_write_access: boolean;
  readonly countries: CountryKeyDto[];
}

class CountryKeyDto {
  readonly code: string;
}
