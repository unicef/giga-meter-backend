import { Reflector } from '@nestjs/core';
import { RequiredCategories, CATEGORY_KEY } from './category.decorator';

describe('RequiredCategories Decorator', () => {
  it('should set the correct metadata for the given categories', () => {
    // A dummy class with a method decorated by our decorator
    class TestController {
      @RequiredCategories('admin', 'user')
      public sampleEndpoint() {}
    }

    const reflector = new Reflector();
    const metadata = reflector.get<string[]>(CATEGORY_KEY, TestController.prototype.sampleEndpoint);

    expect(metadata).toBeDefined();
    expect(metadata).toEqual(['admin', 'user']);
  });

  it('should set metadata to an empty array when no categories are provided', () => {
    class TestController {
      @RequiredCategories()
      public sampleEndpoint() {}
    }

    const reflector = new Reflector();
    const metadata = reflector.get<string[]>(CATEGORY_KEY, TestController.prototype.sampleEndpoint);

    expect(metadata).toBeDefined();
    expect(metadata).toEqual([]);
  });
});
