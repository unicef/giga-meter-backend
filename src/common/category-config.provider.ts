import { Injectable, OnModuleInit } from '@nestjs/common';
import { CategoryConfigService } from '../category-config/category-config.service';
import { CATEGORIES, DEFAULT_CATEGORY, CATEGORY_CONFIG, CategoryConfigType} from './category.config';

/**
 * This service provides access to category configurations, either from the database
 * or falling back to static configuration if the database is not available.
 */
@Injectable()
export class CategoryConfigProvider implements OnModuleInit {
  private categories: string[] = [];
  private defaultCategory: string = '';
  private categoryConfigs: CategoryConfigType[] = [];
  private isInitialized = false;

  constructor(private categoryConfigService: CategoryConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    try {
      // Try to load configurations from the database
      const configs = await this.categoryConfigService.findAll() as unknown as CategoryConfigType[];
      
      if (configs.length > 0) {
        this.categories = configs.map(config => config.name);
        
        // Find the default category
        const defaultConfig = configs.find(config => config.isDefault);
        this.defaultCategory = defaultConfig ? defaultConfig.name : configs[0].name;
        
        // Build the category config map
        this.categoryConfigs = configs;
        
        this.isInitialized = true;
      } else {
        // Fall back to static configuration
        this.useStaticConfig();
      }
    } catch (error) {
      console.error('Error loading category configurations from database:', error);
      // Fall back to static configuration
      this.useStaticConfig();
    }
  }

  private useStaticConfig() {
    this.categories = CATEGORIES;
    this.defaultCategory = DEFAULT_CATEGORY;
    this.categoryConfigs = CATEGORY_CONFIG;
    this.isInitialized = true;
  }

  async getCategories(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.categories;
  }

  async getDefaultCategory(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.defaultCategory;
  }

  async getCategoryConfig(category: string): Promise<CategoryConfigType> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    const config = this.categoryConfigs.find(config => config.name === category);
    return config;
  }

  async getAllCategoryConfigs(): Promise<CategoryConfigType[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.categoryConfigs;
  }

  async hasApiAccess(categoryConfig: CategoryConfigType, path: string, method: string): Promise<boolean> {
    
    if (!categoryConfig) {
      return false;
    }
    
    // If allowedAPIs is specified, check if this path/method is allowed
    if (categoryConfig.allowedAPIs?.length) {
      return this.isApiAllowed(categoryConfig.allowedAPIs, path, method);
    }
    
    // If notAllowedAPIs is specified, check if this path/method is not allowed
    if (categoryConfig.notAllowedAPIs.length) {
      return !this.isApiAllowed(categoryConfig.notAllowedAPIs, path, method);
    }
    
    // If neither is specified, allow access by default
    return true;
  }

  private isApiAllowed(apiList: any[], path: string, method: string): boolean {
    return apiList.some(api => {
      // Check if the path matches the pattern
      const pathMatches = this.pathMatchesPattern(path, api.url);
      
      // Check if the method is allowed
      const methodMatches = api.methods.includes('*') || api.methods.includes(method.toUpperCase());
      
      return pathMatches && methodMatches;
    });
  }

  private pathMatchesPattern(path: string, pattern: string): boolean {
    // Convert the pattern to a regex
    const regexPattern = pattern
      .replace(/\//g, '\\/') // Escape forward slashes
      .replace(/\{[^}]+\}/g, '[^/]+') // Replace {param} with regex for any character except /
      .replace(/\*/g, '.*'); // Replace * with regex for any character
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
}
