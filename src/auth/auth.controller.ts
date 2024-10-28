import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('generate_token')
  @ApiOperation({
    summary: 'Returns a jwt token based on the admin secret value',
  })
  @ApiHeader({
    name: 'admin_secret',
    description: 'The admin secret value',
    required: true,
  })
  async generateToken(@Headers('admin_secret') adminSecret: string) {
    if (adminSecret !== process.env.ADMIN_SECRET) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    const payload = {
      has_write_access: true,
      is_self_generated: true,
    };
    const token = await this.jwtService.signAsync(payload);
    return { token };
  }
}
