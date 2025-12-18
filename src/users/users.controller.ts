import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

import { Roles } from 'src/roles/roles.decorator';
import {
  GetUserDtoResponse,
  GetUsersDtoResponse,
  GetUsersQueryDto,
  SignUserDtoResponse,
  UpdateUserDto,
} from './users.dto';
import { PERMISSION_SLUGS } from 'src/roles/roles.constants';

@ApiTags('Users Management')
@Controller('api/v1/users')
export class UsersController {
  private logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Get('signin')
  @Roles('')
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
      if (error instanceof ForbiddenException) {
        return response.status(403).json({
          data: null,
          message: error.message,
          status: 403,
        });
      }

      return response.status(500).json({
        data: null,
        message: 'Error during user signin',
        status: 500,
      });
    }
  }

  @Get('common-configs')
  @Roles('')
  @ApiOperation({
    summary: 'user getCommonConfigs',
    description: 'user getCommonConfigs',
  })
  @ApiResponse({
    status: 200,
    description: 'getCommonConfigs',
    type: Object,
  })
  async getCommonConfigs(): Promise<any> {
    try {
      return this.usersService.getCommonConfigs();
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error during user signin');
    }
  }

  @Get()
  @Roles(PERMISSION_SLUGS.CAN_VIEW_USER, PERMISSION_SLUGS.CAN_ACCESS_USERS_TAB)
  @ApiOperation({
    summary: 'Get users',
    description: 'Get a list of users with pagination and ordering',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved users',
    type: GetUsersDtoResponse,
  })
  async getUsers(@Query() query: GetUsersQueryDto): Promise<any> {
    try {
      return this.usersService.getUsers(query);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error retrieving users');
    }
  }

  @Get(':id')
  @Roles(PERMISSION_SLUGS.CAN_VIEW_USER, PERMISSION_SLUGS.CAN_ACCESS_USERS_TAB)
  @ApiOperation({
    summary: 'Get user by id',
    description: 'Get a single user by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user',
    type: GetUserDtoResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('id') id: number): Promise<GetUserDtoResponse> {
    try {
      return this.usersService.getUserById(id);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error retrieving user');
    }
  }

  @Put(':id')
  @Roles(PERMISSION_SLUGS.CAN_UPDATE_USER)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update a user by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated user',
    type: GetUserDtoResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUser(
    @Req() request: any,
    @Param('id') id: number,
    @Body() data: UpdateUserDto,
  ): Promise<GetUserDtoResponse> {
    try {
      const loggedInUser = await this.usersService.signinUser({
        email: request.b2cUser.emails[0],
        username: request.b2cUser.emails[0],
      });
      return this.usersService.updateUser(id, data, loggedInUser);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error updating user');
    }
  }
}
