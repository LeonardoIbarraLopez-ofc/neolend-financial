import { Inject, Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../common/database';
import { SigningService } from '../signing/signing.service';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createLogger } from '@neolend/ts-common';

const log = createLogger('compliance-svc:regulator');

@Injectable()
export class RegulatorService implements OnModuleInit {
  private wormDir!: string;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly signing: SigningService,
  ) {}

  onModuleInit() {
    this.resolveWormDirectory();
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
  }

  /**
   * Solicita la generación de un reporte de trazabilidad para un rango de fechas.
   * Crea un job en la BD e inicia el procesamiento asíncrono.
   */
  async requestScoringTraceabilityReport(periodFrom: string, periodTo: string): Promise<{ jobId: string; status: string }> {
    const jobId = randomUUID();
    
    // Validar formato de fechas básico
    const fromDate = new Date(periodFrom);
    const toDate = new Date(periodTo);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Utilice formato YYYY-MM-DD o ISO-8601');
    }

    await this.pool.query(
      `INSERT INTO compliance.report_jobs (id, report_type, period_from, period_to, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [jobId, 'SCORING_TRACEABILITY', periodFrom, periodTo, 'QUEUED']
    );

    log.info({ jobId, periodFrom, periodTo }, 'Reporte de trazabilidad solicitado. Procesando en background...');
    
    // Iniciar procesamiento en background
    setImmediate(() => this.generateReportInBackground(jobId, periodFrom, periodTo).catch((err) => {
      log.error({ err, jobId }, 'Error al generar reporte de trazabilidad en background');
    }));

    return { jobId, status: 'QUEUED' };
  }

  private async generateReportInBackground(jobId: string, periodFrom: string, periodTo: string) {
    try {
      log.info({ jobId }, 'Iniciando generación de reporte...');
      
      // 1. Consultar eventos del audit_log dentro del rango de fechas (usando la fecha de creación del log)
      const { rows } = await this.pool.query(
        `SELECT record_id, correlation_id, event_type, actor, payload, created_at
         FROM compliance.audit_log
         WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz + interval '1 day' - interval '1 second'
         ORDER BY id ASC`,
        [periodFrom, periodTo]
      );

      log.info({ jobId, recordsCount: rows.length }, 'Registros obtenidos para compilar el reporte');

      // 2. Agrupar y compilar los datos de trazabilidad
      const tracesByCorrelationId: Record<string, any> = {};
      for (const row of rows) {
        const corrId = row.correlation_id;
        const envelope = row.payload;

        if (!tracesByCorrelationId[corrId]) {
          tracesByCorrelationId[corrId] = {
            correlationId: corrId,
            events: [],
          };
        }

        tracesByCorrelationId[corrId].events.push({
          eventId: row.record_id,
          eventType: row.event_type,
          actor: row.actor,
          occurredAt: row.created_at,
          payload: envelope.payload,
        });
      }

      const compiledReport = {
        reportId: jobId,
        generatedAt: new Date().toISOString(),
        periodFrom,
        periodTo,
        totalApplications: Object.keys(tracesByCorrelationId).length,
        traces: Object.values(tracesByCorrelationId),
      };

      // 3. Firmar digitalmente el reporte completo usando JWS
      const jwsSignature = await this.signing.sign(compiledReport);

      // 4. Guardar archivo físico en el directorio WORM reports
      const reportsDir = join(this.wormDir, 'reports');
      if (!existsSync(reportsDir)) {
        mkdirSync(reportsDir, { recursive: true });
      }

      const relativePath = `./worm/reports/${jobId}.json`;
      const fullPath = join(reportsDir, `${jobId}.json`);
      
      writeFileSync(
        fullPath,
        JSON.stringify({ report: compiledReport, jws: jwsSignature }, null, 2),
        'utf8'
      );

      // 5. Actualizar el estado del job en la base de datos
      await this.pool.query(
        `UPDATE compliance.report_jobs
         SET status = 'COMPLETED', output_uri = $2, signature = $3
         WHERE id = $1`,
        [jobId, relativePath, jwsSignature]
      );

      log.info({ jobId, filePath: fullPath }, 'Reporte de trazabilidad generado y firmado exitosamente');
    } catch (err) {
      log.error({ err, jobId }, 'Fallo al compilar o firmar el reporte');
      await this.pool.query(
        `UPDATE compliance.report_jobs
         SET status = 'FAILED'
         WHERE id = $1`,
        [jobId]
      );
    }
  }

  /**
   * Obtiene la descarga de un reporte por su ID.
   */
  async getReportDownload(jobId: string): Promise<any> {
    const { rows } = await this.pool.query(
      `SELECT id, status, output_uri, signature
       FROM compliance.report_jobs
       WHERE id = $1`,
      [jobId]
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Reporte con ID ${jobId} no encontrado`);
    }

    const job = rows[0];
    if (job.status === 'QUEUED') {
      throw new BadRequestException('El reporte aún se encuentra en procesamiento (estado: QUEUED)');
    }
    if (job.status === 'FAILED') {
      throw new BadRequestException('La generación del reporte falló (estado: FAILED)');
    }

    // Leer el archivo físico WORM
    const reportsDir = join(this.wormDir, 'reports');
    const fullPath = join(reportsDir, `${jobId}.json`);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`El archivo físico del reporte no existe en el WORM`);
    }

    try {
      const content = readFileSync(fullPath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      log.error({ err, fullPath }, 'Error al leer el archivo del reporte firmado');
      throw new BadRequestException('No se pudo leer el archivo del reporte firmado');
    }
  }

  /**
   * Obtiene todos los análisis de sesgo demográfico de la base de datos.
   */
  async getBiasAudits(): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT id, period, cohort, metric, value, disparity, flagged
       FROM compliance.bias_audits
       ORDER BY period DESC, cohort ASC`
    );
    return rows;
  }
}
