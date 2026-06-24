import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { GatewayService } from './gateway.service';

/**
 * Tests unitarios del GatewayService (Tarea D2.1 — auth JWT).
 */
describe('GatewayService', () => {
  let service: GatewayService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe emitir un JWT para credenciales válidas', () => {
    const result = service.login({
      email: 'ana@neolend.com',
      password: 'pass1234',
      role: 'analyst',
    });

    expect(result.accessToken).toBe('mocked.jwt.token');
    expect(result.expiresIn).toBeDefined();
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@neolend.com', role: 'analyst' }),
      expect.any(Object),
    );
  });

  it('debe lanzar error si la contraseña es muy corta', () => {
    expect(() =>
      service.login({
        email: 'test@neolend.com',
        password: 'ab',
        role: 'applicant',
      }),
    ).toThrow();
  });

  it('debe incluir el rol en el payload del token', () => {
    service.login({
      email: 'investor@neolend.com',
      password: 'password',
      role: 'investor',
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'investor' }),
      expect.any(Object),
    );
  });
});
