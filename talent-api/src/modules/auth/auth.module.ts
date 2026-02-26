import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserBridgeService } from './services/user-bridge.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { TalentUser } from '../users/entities/talent-user.entity';
import { TalentUserRole } from '../users/entities/talent-user-role.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    TypeOrmModule.forFeature([TalentUser, TalentUserRole, CandidateProfile]),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, UserBridgeService, AuthService],
  exports: [UserBridgeService],
})
export class AuthModule {}
