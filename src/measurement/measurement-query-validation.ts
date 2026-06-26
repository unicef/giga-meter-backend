import { HttpException, HttpStatus } from '@nestjs/common';
import { PersistedMeasurementProtocol } from './measurement-quality-metrics';

const MEASUREMENT_LIST_ORDER_BY_FIELDS = [
  'timestamp',
  'created_at',
  'protocol',
] as const;

const MEASUREMENT_LIST_FILTER_BY_FIELDS = ['timestamp', 'created_at'] as const;

export function isPersistedMeasurementProtocol(
  value: string,
): value is PersistedMeasurementProtocol {
  return value === 'mlab' || value === 'cloudflare';
}

export function validateMeasurementListOrderBy(orderBy?: string): void {
  if (
    orderBy &&
    !MEASUREMENT_LIST_ORDER_BY_FIELDS.some((field) => orderBy.includes(field))
  ) {
    throw new HttpException(
      'Invalid orderBy value provided, accepted values are: timestamp, -timestamp, created_at, -created_at, protocol, -protocol',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function validateMeasurementListFilterBy(filterBy?: string): void {
  if (
    filterBy &&
    !MEASUREMENT_LIST_FILTER_BY_FIELDS.includes(
      filterBy as (typeof MEASUREMENT_LIST_FILTER_BY_FIELDS)[number],
    )
  ) {
    throw new HttpException(
      'Invalid filterBy value provided',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function validateMeasurementListProtocol(protocol?: string): void {
  if (protocol && !isPersistedMeasurementProtocol(protocol)) {
    throw new HttpException(
      'Invalid protocol value provided, accepted values are: mlab, cloudflare',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function validateGetMeasurementsParams(
  orderBy?: string,
  country_iso3_code?: string,
  filterBy?: string,
  filterCondition?: string,
  filterValue?: Date,
  write_access?: boolean,
  countries_iso3?: string[],
  protocol?: string,
) {
  validateMeasurementListOrderBy(orderBy);
  validateMeasurementListFilterBy(filterBy);
  validateMeasurementListProtocol(protocol);
  if (filterBy && !filterCondition) {
    throw new HttpException(
      'Please provide a valid filterCondition with filterBy column ${filterBy}',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && filterCondition && filterValue == null) {
    throw new HttpException(
      'No filterValue provided with filterBy and filterCondition values',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    !write_access &&
    country_iso3_code &&
    !countries_iso3?.includes(country_iso3_code)
  ) {
    throw new HttpException('not authorized to access', HttpStatus.BAD_REQUEST);
  }
}
