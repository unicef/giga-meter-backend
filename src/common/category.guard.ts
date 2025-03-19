import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CATEGORY_CONFIG, hasApiAccess, DEFAULT_CATEGORY } from './category.config';
import { CATEGORY_KEY } from './category.decorator';

@Injectable()
export class CategoryGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract category from request
    const category = this.extractCategory(request);
    
    // Store the category in the request for later use (e.g., filtering response data)
    request.category = category;
    
    // If category doesn't exist in config, deny access
    if (!CATEGORY_CONFIG[category]) {
      throw new ForbiddenException(`Category '${category}' not found`);
    }

    // Check if this handler has category requirements
    const requiredCategories = this.reflector.get<string[]>(
      CATEGORY_KEY,
      context.getHandler(),
    );
    
    // If this endpoint has specific category requirements
    if (requiredCategories && requiredCategories.length > 0) {
      // Check if the user's category is in the required list
      const hasRequiredCategory = requiredCategories.includes(category);
      if (!hasRequiredCategory) {
        throw new ForbiddenException(
          `This endpoint requires one of these categories: ${requiredCategories.join(', ')}`,
        );
      }
      // If category check passed, allow the request
      return true;
    }
    
    // Otherwise check general access based on URL/method using the centralized helper
    const path = request.path;
    const method = request.method;
    
    // Check if category has access to this path and method using the centralized helper
    const hasAccess = hasApiAccess(category, path, method);
    
    if (!hasAccess) {
      console.log(`Category '${category}' does not have access to ${method} ${path}`);
      throw new ForbiddenException(`You do not have access to ${method} ${path}`);
    }
    
    return true;
  }
  
  private extractCategory(request: any): string {
    // If the AuthGuard has already set the category, use that
    if (request.category) {
      return request.category;
    }
    
    // const categoryHeader = request.headers['x-api-category'];
    // if (categoryHeader) {
    //   return categoryHeader;
    // }
    
    // // Fallback to a token claim if using JWT
    // if (request.user && request.user.category) {
    //   return request.user.category;
    // }
    
    // // Fallback to a query parameter
    // if (request.query.category) {
    //   return request.query.category;
    // }
    
    // Default to configured default category
    return DEFAULT_CATEGORY;
  }
}
