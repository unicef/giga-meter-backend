import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthGuard } from '../auth/auth.guard';

interface AuthenticatedRequest extends Request {
  category?: string;
  has_write_access?: boolean;
  is_super_user?: boolean;
}

@Injectable()
export class SwaggerAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SwaggerAuthMiddleware.name);
  
  constructor(private authGuard: AuthGuard) { }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    let requestedCategory;
    const pathParts = req.originalUrl.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'api' && pathParts[2]) {
      requestedCategory = pathParts[2].split('?')[0]?.toLowerCase();
    }

    // Skip authentication for non-Swagger routes
    if (pathParts.length > 3) {
      return next();
    }
    try {
      const token = req.query.token as string;

      if (!token || !requestedCategory) {
        throw new Error('Unauthorized access - No token provided')
      }

      const isValid = await this.authGuard.validateToken(token, req);
      if (!isValid) {
        throw new Error('Unauthorized access - Invalid token')
      }

      if (req.category !== requestedCategory) {
        throw new Error(`Forbidden access - Your category '${req.category}' does not have access to '${requestedCategory}' documentation`)
      }

      next();
    } catch (error) {
      this.logger.warn(`Swagger authentication failed: ${error?.message || error}`);
      return res.status(401).send(`
       <!DOCTYPE html>
        <html>
        <head>
            <title>Access Denied - Giga Meter Swagger API</title>
            <style>body{font-family:Arial,sans-serif;margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;background:#f8f9fa}.container{max-width:600px;padding:2rem;background:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}h1{color:#dc3545;margin-top:0}</style>
        </head>
        <body>
            <div class="container">
                <h1>401 Unauthorized Access</h1>
                <p>You don't have permission to access to the Giga Meter Swagger API documentation.</p>
                <p>Please contact your administrator for access credentials.</p>
            </div>
        </body>
        </html>
      `);
    }
  }
}
