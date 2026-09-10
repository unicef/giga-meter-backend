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
