import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ValidateSize } from './validation.decorator';

// A more robust helper function to extract the factory function from the decorator
function getDecoratorFactory(decorator: Function) {
  class TestController {
    public test(@decorator() size: number) {}
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('ValidateSize Decorator', () => {
  it('should return default size when size is not provided', () => {
    const factory = getDecoratorFactory(ValidateSize);
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ query: {} }) }),
    });
    // Pass an empty object to simulate the decorator being called without arguments
    expect(factory({}, mockContext)).toBe(10);
  });

  it('should return the correct size when valid', () => {
    const factory = getDecoratorFactory(ValidateSize);
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ query: { size: '50' } }) }),
    });
    expect(factory({}, mockContext)).toBe(50);
  });

  it('should throw HttpException for size less than min', () => {
    const factory = getDecoratorFactory(ValidateSize);
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ query: { size: '5' } }) }),
    });
    const options = { min: 10 };
    expect(() => factory(options, mockContext)).toThrow(HttpException);
  });

  it('should throw HttpException for size greater than max', () => {
    const factory = getDecoratorFactory(ValidateSize);
    const mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ query: { size: '100' } }) }),
    });
    const options = { max: 50 };
    expect(() => factory(options, mockContext)).toThrow(HttpException);
  });
});