export class ValidateApiKeyDto {
  readonly success: boolean;
  readonly timestamp: string;
  readonly data: ValidateKeyDto;
}

class ValidateKeyDto {
  readonly has_write_access: boolean;
  readonly countries: CountryKeyDto[];
  readonly category?: string; // Category of the user (public, gov, admin)
}

class CountryKeyDto {
  readonly code: string;
  readonly iso3_format: string;
}
