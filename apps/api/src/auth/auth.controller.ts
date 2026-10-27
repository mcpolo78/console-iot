import { Body, Controller, NotFoundException, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return { token, role: user.role };
  }

  // Accès visiteur sans mot de passe (démo publique) : jeton en lecture seule, rôle VIEWER.
  // Désactivable avec DEMO_LOGIN=false.
  @Post('demo')
  async demo() {
    if (process.env.DEMO_LOGIN === 'false') throw new NotFoundException();
    const token = await this.jwt.signAsync({ sub: 0, email: 'visiteur@demo.fr', role: 'VIEWER' });
    return { token, role: 'VIEWER' };
  }
}
