import {
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  Response,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthenticationService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private usersService: UsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Request() req) {
    const userWithoutPsw: Partial<User> = req.user;

    return this.authenticationService.login(userWithoutPsw);
  }

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  async register(@Response() response, @Request() request) {
    const { otpAuthUrl } =
      await this.authenticationService.generateTwoFactorAuthenticationSecret(
        request.user,
      );

    return response.json(
      await this.authenticationService.generateQrCodeDataURL(otpAuthUrl),
    );
  }

  @Post('2fa/turn-on')
  @UseGuards(JwtAuthGuard)
  async turnOnTwoFactorAuthentication(@Request() request, @Body() body) {
    const isCodeValid =
      this.authenticationService.isTwoFactorAuthenticationCodeValid(
        body.twoFactorAuthenticationCode,
        request.user,
      );
    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }
    await this.usersService.turnOnTwoFactorAuthentication(request.user.id);
  }

  @Post('2fa/authenticate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async authenticate(@Request() request, @Body() body) {
    const isCodeValid =
      this.authenticationService.isTwoFactorAuthenticationCodeValid(
        body.twoFactorAuthenticationCode,
        request.user,
      );

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }

    return this.authenticationService.loginWith2fa(request.user);
  }
}
