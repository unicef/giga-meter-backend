import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CATEGORY_KEY } from './category.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { CategoryConfigProvider } from './category-config.provider';

@Injectable()
export class CategoryGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private categoryConfigProvider: CategoryConfigProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const isMetrics = request.url === '/metrics';
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || isMetrics) {
      return true;
    }

    // Extract category from request
    const category = await this.extractCategory(request);

    // Store the category in the request for later use (e.g., filtering response data)
    request.category = category;

    // Get the category config
    const categoryConfig =
      await this.categoryConfigProvider.getCategoryConfig(category);
    // If category doesn't exist in config, deny access
    if (!categoryConfig) {
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

    // Otherwise check general access based on URL/method
    const path = request.path;
    const method = request.method;

    // Check if category has access to this path and method
    const hasAccess = await this.categoryConfigProvider.hasApiAccess(
      categoryConfig,
      path,
      method,
    );

    if (!hasAccess) {
      console.error(
        `Category '${category}' does not have access to ${method} ${path}`,
      );
      throw new ForbiddenException(`Unauthorized to access ${method} ${path}`);
    }

    return true;
  }

  private async extractCategory(request: any): Promise<string> {
    // If the AuthGuard has already set the category, use that
    if (request.category) {
      return request.category;
    }

    // Default to configured default category
    return await this.categoryConfigProvider.getDefaultCategory();
  }
}
