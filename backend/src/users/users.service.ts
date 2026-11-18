import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { generateTempPassword } from '../common/utils/crypto';
import { paginate, skipTake, sortField } from '../common/dto/pagination.dto';
import { setAuditHints } from '../common/context/request-context';
import { isDemoAccount } from '../meta/demo';
import type { AuthUser } from '../common/types';
import { presentUser, USER_SITES_INCLUDE, UserWithSites } from './user.presenter';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/users.dto';

const TEMP_PASSWORD_TTL_MS = 7 * 86_400_000;
const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async list(q: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.siteId ? { sites: { some: { siteId: q.siteId } } } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: USER_SITES_INCLUDE,
        orderBy: [
          sortField(
            q.sortBy,
            q.sortOrder ?? (q.sortBy === 'name' || q.sortBy === 'email' ? 'asc' : 'desc'),
            q.sortBy === 'lastLoginAt',
          ),
          { id: 'asc' },
        ],
        ...skipTake(q),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows.map(presentUser), total, q);
  }

  async get(id: string): Promise<UserWithSites> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: USER_SITES_INCLUDE });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async assertSites(siteIds: string[], role: Role) {
    if (role !== Role.SUPER_ADMIN && siteIds.length === 0) {
      throw new BadRequestException({
        message: 'Assign at least one website.',
        details: [{ field: 'siteIds', errors: ['Assign at least one website.'] }],
      });
    }
    const unique = [...new Set(siteIds)];
    const count = await this.prisma.site.count({ where: { id: { in: unique } } });
    if (count !== unique.length)
      throw new BadRequestException('One or more websites do not exist.');
    return unique;
  }

  private assertNotProtectedDemo(email: string) {
    if (this.config.get('DEMO_MODE') && isDemoAccount(email)) {
      throw new ForbiddenException(
        'Demo accounts are protected in the public demo. Create a new user to try this.',
      );
    }
  }

  private async sendWelcome(user: UserWithSites, tempPassword: string, invitedBy: string) {
    return this.mail.send(user.email, 'Your PIF Admin Panel account is ready', 'welcome', {
      name: user.name.split(' ')[0],
      email: user.email,
      role: ROLE_LABEL[user.role],
      sites: user.sites.map((s) => s.site.name),
      tempPassword,
      invitedBy,
      expiresAt: user.tempPasswordExpiresAt?.toUTCString(),
      loginUrl: `${this.config.get('FRONTEND_URL')}/login`,
    });
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({
        message: 'A user with this email already exists.',
        details: [{ field: 'email', errors: ['A user with this email already exists.'] }],
      });
    }
    const siteIds = await this.assertSites(dto.siteIds, dto.role);
    const tempPassword = generateTempPassword(12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        status: UserStatus.PENDING,
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
        passwordHash: await this.passwords.hash(tempPassword),
        sites: { create: siteIds.map((siteId) => ({ siteId })) },
      },
      include: USER_SITES_INCLUDE,
    });
    const emailSent = await this.sendWelcome(user, tempPassword, actor.name);
    const presented = presentUser(user);
    await this.audit.log({
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      summary: `${actor.name} added ${ROLE_LABEL[user.role]} ${user.name} (${user.email})`,
      after: presented,
      site: null,
    });
    if (!emailSent) {
      await this.audit.log({
        action: 'user.welcome_email_failed',
        entityType: 'user',
        entityId: user.id,
        summary: `Welcome email to ${user.email} could not be delivered`,
        site: null,
      });
    }
    return { user: presented, emailSent };
  }

  private async superAdminCount(excludeId?: string) {
    return this.prisma.user.count({
      where: {
        role: Role.SUPER_ADMIN,
        status: { not: UserStatus.INACTIVE },
        id: { not: excludeId },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const user = await this.get(id);
    const before = presentUser(user);
    if (dto.role && dto.role !== user.role) {
      if (user.id === actor.id) throw new ForbiddenException('You cannot change your own role.');
      if (user.role === Role.SUPER_ADMIN && (await this.superAdminCount(user.id)) === 0) {
        throw new ForbiddenException('You cannot change the role of the last Super Admin.');
      }
      this.assertNotProtectedDemo(user.email);
    }
    const role = dto.role ?? user.role;
    const siteIds = dto.siteIds ? await this.assertSites(dto.siteIds, role) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (siteIds) {
        await tx.userSite.deleteMany({ where: { userId: id, siteId: { notIn: siteIds } } });
        await tx.userSite.createMany({
          data: siteIds.map((siteId) => ({ userId: id, siteId })),
          skipDuplicates: true,
        });
      }
      return tx.user.update({
        where: { id },
        data: { name: dto.name, role: dto.role },
        include: USER_SITES_INCLUDE,
      });
    });
    const after = presentUser(updated);

    if (dto.role && dto.role !== user.role) {
      await this.audit.log({
        action: 'user.role_changed',
        entityType: 'user',
        entityId: id,
        summary: `${actor.name} changed ${user.name}'s role from ${ROLE_LABEL[user.role]} to ${ROLE_LABEL[dto.role]}`,
        before: { role: user.role },
        after: { role: dto.role },
        site: null,
      });
    }
    const beforeSites = before.sites.map((s) => s.name).sort();
    const afterSites = after.sites.map((s) => s.name).sort();
    if (siteIds && JSON.stringify(beforeSites) !== JSON.stringify(afterSites)) {
      await this.audit.log({
        action: 'user.sites_changed',
        entityType: 'user',
        entityId: id,
        summary: `${actor.name} changed ${user.name}'s websites to ${afterSites.join(', ') || 'none'}`,
        before: { sites: beforeSites },
        after: { sites: afterSites },
        site: null,
      });
    }
    if (dto.name && dto.name !== user.name) {
      await this.audit.log({
        action: 'user.updated',
        entityType: 'user',
        entityId: id,
        summary: `${actor.name} renamed ${user.name} to ${dto.name}`,
        before: { name: user.name },
        after: { name: dto.name },
        site: null,
      });
    }
    return after;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actor: AuthUser) {
    const user = await this.get(id);
    if (user.id === actor.id) throw new ForbiddenException('You cannot change your own status.');
    this.assertNotProtectedDemo(user.email);
    if (
      status === 'INACTIVE' &&
      user.role === Role.SUPER_ADMIN &&
      (await this.superAdminCount(user.id)) === 0
    ) {
      throw new ForbiddenException('You cannot deactivate the last Super Admin.');
    }
    // Re-activating a user who never finished first login returns them to "pending".
    const next =
      status === 'ACTIVE'
        ? user.mustChangePassword
          ? UserStatus.PENDING
          : UserStatus.ACTIVE
        : UserStatus.INACTIVE;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: next, ...(status === 'INACTIVE' ? { tokenVersion: { increment: 1 } } : {}) },
      include: USER_SITES_INCLUDE,
    });
    if (status === 'INACTIVE') await this.tokens.revokeAllForUser(id, 'deactivated');
    await this.audit.log({
      action: status === 'INACTIVE' ? 'user.deactivated' : 'user.activated',
      entityType: 'user',
      entityId: id,
      summary: `${actor.name} ${status === 'INACTIVE' ? 'deactivated' : 'activated'} ${user.name}`,
      before: { status: user.status },
      after: { status: next },
      site: null,
    });
    return presentUser(updated);
  }

  async resendWelcome(id: string, actor: AuthUser) {
    const user = await this.get(id);
    if (!user.mustChangePassword) {
      throw new BadRequestException('This user has already set their own password.');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new BadRequestException('Activate this user before resending the welcome email.');
    }
    const tempPassword = generateTempPassword(12);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await this.passwords.hash(tempPassword),
        tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
      include: USER_SITES_INCLUDE,
    });
    // Any pending verification for the old password is invalidated too.
    await this.prisma.otpCode.updateMany({
      where: { userId: id, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
    await this.tokens.revokeAllForUser(id, 'password_reset');
    const emailSent = await this.sendWelcome(updated, tempPassword, actor.name);
    await this.audit.log({
      action: emailSent ? 'user.welcome_resent' : 'user.welcome_email_failed',
      entityType: 'user',
      entityId: id,
      summary: emailSent
        ? `${actor.name} re-sent the welcome email to ${user.email} with a new temporary password`
        : `Welcome email to ${user.email} could not be delivered`,
      site: null,
    });
    return { user: presentUser(updated), emailSent };
  }

  async remove(id: string, actor: AuthUser) {
    const user = await this.get(id);
    if (user.id === actor.id) throw new ForbiddenException('You cannot delete your own account.');
    this.assertNotProtectedDemo(user.email);
    if (user.role === Role.SUPER_ADMIN && (await this.superAdminCount(user.id)) === 0) {
      throw new ForbiddenException('You cannot delete the last Super Admin.');
    }
    await this.prisma.user.delete({ where: { id } });
    setAuditHints({ skip: true });
    await this.audit.log({
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      summary: `${actor.name} deleted ${user.name} (${user.email})`,
      before: presentUser(user),
      site: null,
    });
  }

  async updateProfile(actor: AuthUser, data: { name?: string; avatarColor?: string }) {
    if (data.avatarColor && !/^#[0-9a-fA-F]{6}$/.test(data.avatarColor)) {
      throw new BadRequestException('Avatar colour must be a hex value like #4A4A89.');
    }
    const before = await this.get(actor.id);
    const updated = await this.prisma.user.update({
      where: { id: actor.id },
      data,
      include: USER_SITES_INCLUDE,
    });
    await this.audit.log({
      action: 'profile.updated',
      entityType: 'user',
      entityId: actor.id,
      summary: `${updated.name} updated their profile`,
      before: { name: before.name, avatarColor: before.avatarColor },
      after: { name: updated.name, avatarColor: updated.avatarColor },
      site: null,
    });
    return presentUser(updated);
  }
}
