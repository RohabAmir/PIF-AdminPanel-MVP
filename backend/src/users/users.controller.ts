import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission } from '../common/decorators';
import { Permission } from '../common/permissions';
import type { AuthUser } from '../common/types';
import { presentUser } from './user.presenter';
import { UsersService } from './users.service';
import { CreateUserDto, ListUsersQueryDto, SetStatusDto, UpdateUserDto } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@RequirePermission(Permission.USERS_MANAGE)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (search, filter by role/status/site, sort, paginate)' })
  list(@Query() q: ListUsersQueryDto) {
    return this.users.list(q);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return presentUser(await this.users.get(id));
  }

  @Post()
  @ApiOperation({ summary: 'Add a user — generates a temporary password and emails a welcome message' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update name, role and/or website assignments' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.update(id, dto, actor);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate (deactivation revokes all sessions immediately)' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto, @CurrentUser() actor: AuthUser) {
    return this.users.setStatus(id, dto.status, actor);
  }

  @Post(':id/resend-welcome')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a new temporary password and resend the welcome email' })
  resendWelcome(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.users.resendWelcome(id, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    await this.users.remove(id, actor);
  }
}
