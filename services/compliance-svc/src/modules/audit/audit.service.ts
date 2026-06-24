import { Inject, Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../common/database';
import { EventBus, createLogger } from '@neolend/ts-common';
import { Topics, type EventEnvelope } from '@neolend/ts-events';
import { SigningService } from '../signing/signing.service';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const log = createLogger('compliance-svc:audit');

@Injectable()
export class AuditService implements OnModuleInit, OnApplicationBootstrap {
  private readonly bus = new EventBus('compliance-svc');
  private wormDir!: string;
  private queue = Promise.resolve();

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly signing: SigningService,
  ) {}

  onModuleInit() {
    this.resolveWormDirectory();
  }

  async onApplicationBootstrap() {
    // Iniciar suscripción de eventos en background para no bloquear el inicio
    this.subscribeToEvents().catch((err) => {
      log.error({ err }, 'Fallo crítico al suscribirse al bus de eventos');
    });
  }

  private resolveWormDirectory() {
    const pathsToTry = [
      '/worm',
      join(process.cwd(), 'worm'),
      join(process.cwd(), '..', '..', 'worm'),
    ];

    for (const p of pathsToTry) {
      if (existsSync(p)) {
        this.wormDir = p;
        break;
      }
    }

    if (!this.wormDir) {
      this.wormDir = join(process.cwd(), 'worm');
      try {
        mkdirSync(this.wormDir, { recursive: true });
      } catch (err) {
        log.warn({ err }, 'No se pudo crear el directorio WORM, usando temporal local');
        this.wormDir = join(__dirname, '..', '..', '..', 'worm');
        mkdirSync(this.wormDir, { recursive: true });
      }
    }
    log.info({ wormDir: this.wormDir }, 'Directorio WORM resuelto');
  }

  private async subscribeToEvents() {
    const topicsToConsume = Object.values(Topics);
    log.info({ topics: topicsToConsume }, 'Suscribiendo compliance-svc a tópicos de eventos');

    const connectAndSubscribe = async () => {
      try {
        await this.bus.subscribe(
          topicsToConsume,
          'compliance-group',
          async (envelope: any) => {
            this.enqueueEventProcessing(envelope);
          }
        );
        log.info(' compliance-svc suscrito exitosamente a Kafka/Redpanda');
      } catch (err) {
        log.warn({ err }, 'No se pudo conectar a Redpanda. Reintentando en 10s...');
        setTimeout(connectAndSubscribe, 10000);
      }
    };

    await connectAndSubscribe();
  }

  private enqueueEventProcessing(envelope: EventEnvelope) {
    this.queue = this.queue
      .then(() => this.processEvent(envelope))
      .catch((err) => {
        log.error({ err, eventId: envelope.eventId }, 'Error procesando evento en cola');
      });
  }

  private async processEvent(envelope: EventEnvelope) {
    // 1. Evitar duplicación (Idempotencia)
    const existsCheck = await this.pool.query(
      'SELECT id FROM compliance.audit_log WHERE record_id = $1',
      [envelope.eventId]
    );
    if (existsCheck.rows.length > 0) {
      log.info({ eventId: envelope.eventId }, 'Evento ya procesado (duplicado omitido)');
      return;
    }

    log.info({ eventType: envelope.eventType, eventId: envelope.eventId }, 'Procesando nuevo evento para auditoría');

    // 2. Obtener el hash del último registro
    const lastRecordResult = await this.pool.query(
      'SELECT hash FROM compliance.audit_log ORDER BY id DESC LIMIT 1'
    );
    const prevHash = lastRecordResult.rows.length > 0 ? lastRecordResult.rows[0].hash : '0';

    // 3. Serialización canónica del payload para hash determinístico
    const canonicalPayload = this.canonicalize(envelope.payload);
    
    // 4. Calcular el Hash SHA-256
    const currentHash = createHash('sha256')
      .update(prevHash + canonicalPayload)
      .digest('hex');

    // 5. Firmar digitalmente el payload (o el sobre) usando JWS
    const signature = await this.signing.sign(envelope.payload);

    // 6. Guardar en WORM local (archivo físico JSON)
    const relativeWormUri = `./worm/${envelope.correlationId}/${envelope.eventId}.json`;
    const fullWormPath = join(this.wormDir, envelope.correlationId, `${envelope.eventId}.json`);
    
    try {
      mkdirSync(dirname(fullWormPath), { recursive: true });
      writeFileSync(fullWormPath, JSON.stringify(envelope, null, 2), 'utf8');
    } catch (err) {
      log.error({ err, path: fullWormPath }, 'Error al escribir copia en WORM');
    }

    // 7. Persistir en la Base de Datos
    await this.pool.query(
      `INSERT INTO compliance.audit_log 
         (record_id, correlation_id, event_type, actor, payload, prev_hash, hash, signature, worm_uri)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        envelope.eventId,
        envelope.correlationId,
        envelope.eventType,
        envelope.producer,
        JSON.stringify(envelope),
        prevHash,
        currentHash,
        signature,
        relativeWormUri,
      ]
    );

    log.info({ eventId: envelope.eventId, hash: currentHash }, 'Evento registrado e inmutable en audit_log');
  }

  /**
   * Serializa un objeto de forma canónica y determinística para hash idéntico.
   */
  public canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalize(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys
        .map((k) => `${JSON.stringify(k)}:${this.canonicalize(obj[k])}`)
        .join(',') +
      '}'
    );
  }

  /**
   * Obtiene la trazabilidad completa de una solicitud (correlationId).
   */
  async getRecordsByCorrelationId(correlationId: string) {
    const { rows } = await this.pool.query(
      `SELECT record_id as "recordId", correlation_id as "correlationId", event_type as "eventType", 
              actor, payload, prev_hash as "prevHash", hash, signature, worm_uri as "wormUri", created_at as "createdAt"
       FROM compliance.audit_log
       WHERE correlation_id = $1
       ORDER BY id ASC`,
      [correlationId]
    );
    return rows;
  }

  /**
   * Verifica la integridad de la cadena de hashes y firmas JWS desde el inicio hasta el recordId provisto.
   */
  async verifyIntegrity(recordId: string): Promise<{ valid: boolean; reason?: string; verifiedCount: number; failedRecordId?: string }> {
    // 1. Encontrar el registro objetivo
    const targetResult = await this.pool.query(
      'SELECT id, record_id FROM compliance.audit_log WHERE record_id = $1',
      [recordId]
    );
    if (targetResult.rows.length === 0) {
      return { valid: false, reason: 'Registro objetivo no encontrado en la base de datos', verifiedCount: 0 };
    }
    const targetDbId = targetResult.rows[0].id;

    // 2. Obtener todos los registros desde el principio hasta el id objetivo
    const { rows: records } = await this.pool.query(
      `SELECT id, record_id, correlation_id, event_type, actor, payload, prev_hash, hash, signature
       FROM compliance.audit_log
       WHERE id <= $1
       ORDER BY id ASC`,
      [targetDbId]
    );

    let lastHash = '0';
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // A. Validar la continuidad de la cadena de hashes
      if (record.prev_hash !== lastHash) {
        return {
          valid: false,
          reason: `Ruptura en la cadena de hash: prev_hash esperado '${lastHash}', encontrado '${record.prev_hash}'`,
          verifiedCount: i,
          failedRecordId: record.record_id,
        };
      }

      // B. Recalcular el hash del registro actual para verificar contra la BD
      const envelope = record.payload as EventEnvelope;
      const canonicalPayload = this.canonicalize(envelope.payload);
      const recalculatedHash = createHash('sha256')
        .update(record.prev_hash + canonicalPayload)
        .digest('hex');

      if (record.hash !== recalculatedHash) {
        return {
          valid: false,
          reason: `Integridad de hash fallida: el hash de la BD '${record.hash}' no coincide con el recalculado '${recalculatedHash}'`,
          verifiedCount: i,
          failedRecordId: record.record_id,
        };
      }

      // C. Verificar la firma digital JWS del payload
      const signVerification = await this.signing.verify(record.signature);
      if (!signVerification.valid) {
        return {
          valid: false,
          reason: `Firma digital JWS inválida: ${signVerification.error}`,
          verifiedCount: i,
          failedRecordId: record.record_id,
        };
      }

      lastHash = record.hash;
    }

    return {
      valid: true,
      verifiedCount: records.length,
    };
  }
}
