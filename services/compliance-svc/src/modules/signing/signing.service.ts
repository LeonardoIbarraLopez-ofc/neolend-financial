import { Injectable, OnModuleInit } from '@nestjs/common';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as jose from 'jose';
import { createLogger } from '@neolend/ts-common';

const log = createLogger('compliance-svc:signing');

@Injectable()
export class SigningService implements OnModuleInit {
  private keysDir!: string;
  private privKeyPath!: string;
  private pubKeyPath!: string;

  private privateKey!: jose.KeyLike;
  private publicKey!: jose.KeyLike;

  async onModuleInit() {
    this.resolveKeysDirectory();
    this.ensureKeysExist();
    await this.loadKeys();
  }

  private resolveKeysDirectory() {
    // Intentar resolver la ruta de keys de forma flexible
    const pathsToTry = [
      '/keys', // Ruta montada en Docker
      join(process.cwd(), 'keys'), // Ejecución local desde el root
      join(process.cwd(), '..', '..', 'keys'), // Ejecución local desde services/compliance-svc
    ];

    for (const p of pathsToTry) {
      if (existsSync(p)) {
        this.keysDir = p;
        break;
      }
    }

    if (!this.keysDir) {
      // Fallback
      this.keysDir = join(process.cwd(), 'keys');
      try {
        mkdirSync(this.keysDir, { recursive: true });
      } catch (err) {
        log.warn({ err }, 'No se pudo crear el directorio de keys, usando temporal local');
        this.keysDir = join(__dirname, '..', '..', '..', 'keys');
        mkdirSync(this.keysDir, { recursive: true });
      }
    }

    this.privKeyPath = join(this.keysDir, 'signing-priv.pem');
    this.pubKeyPath = join(this.keysDir, 'signing-pub.pem');
    log.info({ keysDir: this.keysDir }, 'Directorio de llaves resuelto');
  }

  private ensureKeysExist() {
    if (existsSync(this.privKeyPath) && existsSync(this.pubKeyPath)) {
      log.info('Llaves de firma digital ya existen');
      return;
    }

    log.info('Llaves no encontradas, generando nuevo par RSA 2048...');
    try {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      writeFileSync(this.privKeyPath, privateKey, 'utf8');
      writeFileSync(this.pubKeyPath, publicKey, 'utf8');
      log.info({ privKeyPath: this.privKeyPath, pubKeyPath: this.pubKeyPath }, 'Llaves generadas y guardadas');
    } catch (err) {
      log.error({ err }, 'Error al generar o guardar llaves RSA');
      throw err;
    }
  }

  private async loadKeys() {
    try {
      const privPem = readFileSync(this.privKeyPath, 'utf8');
      const pubPem = readFileSync(this.pubKeyPath, 'utf8');

      this.privateKey = await jose.importPKCS8(privPem, 'RS256');
      this.publicKey = await jose.importSPKI(pubPem, 'RS256');
      log.info('Llaves RSA cargadas correctamente en jose');
    } catch (err) {
      log.error({ err }, 'Error al cargar las llaves en jose');
      throw err;
    }
  }

  /**
   * Firma un payload arbitrario y devuelve un token JWS compacto.
   */
  async sign(payload: any): Promise<string> {
    const encoder = new TextEncoder();
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    return new jose.CompactSign(encoder.encode(serialized))
      .setProtectedHeader({ alg: 'RS256' })
      .sign(this.privateKey);
  }

  /**
   * Verifica un JWS compacto y devuelve el payload decodificado.
   */
  async verify(jws: string): Promise<{ valid: boolean; payload: any; error?: string }> {
    try {
      const { payload: payloadBytes } = await jose.compactVerify(jws, this.publicKey);
      const decoded = new TextDecoder().decode(payloadBytes);
      
      let parsed = decoded;
      try {
        parsed = JSON.parse(decoded);
      } catch {
        // es un string plano
      }

      return { valid: true, payload: parsed };
    } catch (err) {
      log.warn({ err }, 'Fallo en la verificación de firma JWS');
      return { valid: false, payload: null, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
