import { HttpException, HttpStatus } from '@nestjs/common';

export function validateGetMeasurementsParams(
  orderBy?: string,
  country_iso3_code?: string,
  filterBy?: string,
  filterCondition?: string,
  filterValue?: Date,
  write_access?: boolean,
  countries_iso3?: string[],
) {
  if (
    orderBy &&
    !(orderBy?.includes('timestamp') || orderBy?.includes('created_at'))
  ) {
    throw new HttpException(
      'Invalid orderBy value provided, accepted values are: timestamp, -timestamp, created_at, -created_at',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && filterBy != 'timestamp' && filterBy != 'created_at') {
    throw new HttpException(
      'Invalid filterBy value provided',
      HttpStatus.BAD_REQUEST,
    );
  }
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
  // TODO:// remove this logic after adding countries to non expired api keys
  if (
    !write_access &&
    country_iso3_code &&
    !countries_iso3?.includes(country_iso3_code)
  ) {
    throw new HttpException('not authorized to access', HttpStatus.BAD_REQUEST);
  }
}
