import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { SchoolRegistrationExceptionFilter } from './school-registration.filter';

describe('SchoolRegistrationExceptionFilter', () => {
  let filter: SchoolRegistrationExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    filter = new SchoolRegistrationExceptionFilter();
    json = jest.fn();
    status = jest.fn(() => ({ json }));
  });

  function createHost(): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          status,
        }),
      }),
    } as ArgumentsHost;
  }

  it('should keep validation message arrays for school registration', () => {
    const exception = new BadRequestException([
      'school_id should not be empty',
      'contact_email must be an email',
    ]);

    filter.catch(exception, createHost());

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: [
        'school_id should not be empty',
        'contact_email must be an email',
      ],
    });
  });

  it('should keep string messages for regular school registration errors', () => {
    const exception = new BadRequestException('Bad payload');

    filter.catch(exception, createHost());

    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Bad payload',
    });
  });
});
