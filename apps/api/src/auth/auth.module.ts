import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtGuard],
  exports: [JwtGuard],
})
export class AuthModule {}
