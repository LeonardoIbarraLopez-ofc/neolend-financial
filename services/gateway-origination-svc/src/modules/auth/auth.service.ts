import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: string;
}

const DEMO_USERS: DemoUser[] = [
  { id: 'usr-applicant-1', email: 'applicant@neolend.com', password: 'demo', role: 'applicant' },
  { id: 'usr-analyst-1',   email: 'analyst@neolend.com',   password: 'demo', role: 'analyst'    },
  { id: 'usr-investor-1',  email: 'investor@neolend.com',  password: 'demo', role: 'investor'   },
  { id: 'usr-collector-1', email: 'collector@neolend.com', password: 'demo', role: 'collector'  },
];

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  login(email: string, password: string) {
    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const access_token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { access_token, role: user.role, userId: user.id };
  }
}
