import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission } from '../common/decorators';
import { Permission } from '../common/permissions';
import type { AuthUser } from '../common/types';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/users.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@RequirePermission(Permission.PROFILE_SELF)
export class ProfileController {
  constructor(private readonly users: UsersService) {}

  @Patch()
  @ApiOperation({ summary: 'Update own name / avatar colour' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user, dto);
  }
}
