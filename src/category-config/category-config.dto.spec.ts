import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCategoryConfigDto,
  UpdateCategoryConfigDto,
  ApiEndpointDto,
  ResponseFiltersDto,
  SwaggerConfigDto,
} from './category-config.dto';

describe('CategoryConfig DTOs', () => {
  describe('CreateCategoryConfigDto', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreateCategoryConfigDto();
      dto.name = 'test-category';
      dto.isDefault = false;
      dto.allowedAPIs = [
        {
          url: '/api/test',
          methods: ['GET', 'POST'],
        },
      ];
      dto.swagger = {
        visible: true,
        title: 'Test API',
        description: 'Test description',
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without required fields', async () => {
      const dto = new CreateCategoryConfigDto();

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation with empty name', async () => {
      const dto = new CreateCategoryConfigDto();
      dto.name = '';
      dto.isDefault = false;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('UpdateCategoryConfigDto', () => {
    it('should pass validation with valid data', async () => {
      const dto = new UpdateCategoryConfigDto();
      dto.name = 'test-category';
      dto.isDefault = true;
      dto.allowedAPIs = [
        {
          url: '/api/updated',
          methods: ['GET']
        }
      ];
      dto.swagger = {
        visible: false,
        title: 'Test API',
        description: 'Test description'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with minimal required fields', async () => {
      const dto = new UpdateCategoryConfigDto();
      dto.name = 'test-category';
      dto.swagger = {
        visible: true,
        title: 'Test',
        description: 'Test'
      };
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Class transformation', () => {
    it('should transform plain object to DTO instance', () => {
      const plain = {
        name: 'test-category',
        isDefault: false,
        allowedAPIs: [
          {
            url: '/api/test',
            methods: ['GET', 'POST'],
          },
        ],
        swagger: {
          visible: true,
          title: 'Test API',
          description: 'Test description',
        },
      };

      const dto = plainToInstance(CreateCategoryConfigDto, plain);
      expect(dto).toBeInstanceOf(CreateCategoryConfigDto);
      expect(dto.name).toBe(plain.name);
      expect(dto.isDefault).toBe(plain.isDefault);
      expect(dto.allowedAPIs).toEqual(plain.allowedAPIs);
      expect(dto.swagger).toEqual(plain.swagger);
    });
  });
});
