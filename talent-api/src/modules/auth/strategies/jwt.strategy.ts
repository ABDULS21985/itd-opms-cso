import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserBridgeService } from '../services/user-bridge.service';
import { ROLE_PERMISSIONS } from '../../../common/constants/permissions.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userBridgeService: UserBridgeService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') || 'fallback-dev-secret',
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
    });
  }

  async validate(payload: JwtPayload) {
    const talentUser = await this.userBridgeService.findOrCreateUser(
      payload.sub,
      payload.email,
    );

    const roles = talentUser.roles?.map((r) => r.role) || [];

    // Derive permissions from roles using ROLE_PERMISSIONS mapping
    const derivedPermissions = new Set<string>(
      Array.isArray(talentUser.permissions) ? talentUser.permissions : [],
    );
    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      if (rolePerms) {
        for (const perm of rolePerms) {
          derivedPermissions.add(perm);
        }
      }
    }

    return {
      id: talentUser.id,
      externalUserId: talentUser.externalUserId,
      email: talentUser.email,
      displayName: talentUser.displayName,
      userType: talentUser.userType,
      permissions: Array.from(derivedPermissions),
      roles,
    };
  }
}
