import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CATEGORY_CONFIG, hasApiAccess, DEFAULT_CATEGORY } from './category.config';
import { CATEGORY_KEY } from './category.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class CategoryGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    
    // Skip category check if no token validation has happened yet
    // This allows the AuthGuard to run first on controller methods
    // if (!request.category && request.headers.authorization) {
    //   return true;
    // }
    
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
    
    // Default to configured default category
    return DEFAULT_CATEGORY;
  }
}
