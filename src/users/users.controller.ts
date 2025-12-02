import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SignUserDtoResponse } from './users.dto';

@ApiTags('Users Management')
@Controller('api/v1/users')
export class UsersController {
  private logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Get('signin')
  @ApiOperation({
    summary: 'user signin',
    description: 'user signin status',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfull user signin',
    type: SignUserDtoResponse,
  })
  async signinUser(
    @Req() request: any,
    @Res() response: any,
  ): Promise<SignUserDtoResponse> {
    try {
      const userResponse = await this.usersService.signinUser({
        email: request.b2cUser.emails[0],
        username: request.b2cUser.emails[0],
      });
      return response.status(200).json({
        data: userResponse,
        message: 'Successfull user signin',
        status: 200,
      });
    } catch (error) {
      this.logger.error(error);
      return response.status(500).json({
        data: null,
        message: 'Error during user signin',
        status: 500,
      });
    }
  }
}
