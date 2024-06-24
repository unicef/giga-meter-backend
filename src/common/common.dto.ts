export class ApiSuccessResponseDto<T> {
  success: boolean;
  timestamp: string;
  data: T;
  message: string = '';
}

export class ApiFailureResponseDto {
  success: boolean;
  timestamp: string;
  message: string;
}
