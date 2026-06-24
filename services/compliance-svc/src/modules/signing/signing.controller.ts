import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SigningService } from './signing.service';

@Controller('v1')
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Post('sign')
  @HttpCode(HttpStatus.OK)
  async sign(@Body() body: { payload: any }) {
    // Si no viene en un campo payload, firmamos el body completo
    const target = body && 'payload' in body ? body.payload : body;
    const jws = await this.signingService.sign(target);
    return { jws };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() body: { jws: string }) {
    const result = await this.signingService.verify(body.jws);
    return result;
  }
}
