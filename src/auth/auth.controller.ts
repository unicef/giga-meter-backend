import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('generate-token')
  generateToken(@Headers('admin-secret') adminSecret: string) {
    if (adminSecret !== process.env.ADMIN_SECRET) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    const payload = {
      has_write_access: true,
      is_self_generated: true,
    };
    const token = this.jwtService.sign(payload);
    return { token };
  }
}
