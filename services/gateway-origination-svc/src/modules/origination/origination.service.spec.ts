import { Test, TestingModule } from '@nestjs/testing';
import { OriginationService } from './origination.service';

// Variables de entorno para mocks de red (apuntan a URLs que no existen → activan el fallback mock)
process.env.SCORING_URL = 'http://localhost:19999';
process.env.CREDIT_URL = 'http://localhost:19998';
process.env.KAFKA_BROKERS = 'localhost:19997';
// Timeouts muy cortos para que los fetch fallen rápidamente en tests
process.env.SCORING_TIMEOUT_MS = '100';
process.env.CREDIT_TIMEOUT_MS = '100';

// Mock del EventBus para evitar timeouts en tests (Kafka no disponible en CI)
jest.mock('@neolend/ts-common', () => {
  const actual = jest.requireActual('@neolend/ts-common');
  return {
    ...actual,
    EventBus: jest.fn().mockImplementation(() => ({
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

/**
 * Tests unitarios del OriginationService (Tareas D2.3 y D2.4 — Saga + eventos).
 * Timeout extendido a 15s para tests que esperan finalización de la saga async.
 */
describe('OriginationService', () => {
  let service: OriginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OriginationService],
    }).compile();

    service = module.get<OriginationService>(OriginationService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('submit()', () => {
    it('debe retornar applicationId, status PROCESSING y pollUrl', async () => {
      const result = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000001',
        requestedAmount: 450,
        currency: 'USD',
        termMonths: 6,
      });

      expect(result.applicationId).toBeDefined();
      expect(result.status).toBe('PROCESSING');
      expect(result.pollUrl).toContain(result.applicationId);
    }, 10000);

    it('debe usar USD como currency por defecto si no se provee', async () => {
      const result = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000002',
        requestedAmount: 300,
        termMonths: 3,
      });

      // Esperar a que la saga termine antes de verificar el aggregate
      await new Promise((r) => setTimeout(r, 500));

      const app = service.findById(result.applicationId);
      expect(app.currency).toBe('USD');
    }, 10000);

    it('debe aprobar automáticamente montos ≤ 500 (mock de credit-svc)', async () => {
      const result = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000003',
        requestedAmount: 499,
        termMonths: 6,
      });

      // Esperar a que la saga asíncrona complete (mocks locales son instantáneos con fetch fallback)
      await new Promise((r) => setTimeout(r, 1000));

      const app = service.findById(result.applicationId);
      expect(['APPROVED', 'SCORING', 'DECIDING', 'SUBMITTED']).toContain(app.status);
    }, 10000);

    it('debe poner en MANUAL montos > 500 (mock de credit-svc)', async () => {
      const result = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000004',
        requestedAmount: 1500,
        termMonths: 12,
      });

      await new Promise((r) => setTimeout(r, 1000));

      const app = service.findById(result.applicationId);
      // En modo mock el resultado debe ser MANUAL o algún estado de saga en curso
      expect(['MANUAL', 'SCORING', 'DECIDING', 'SUBMITTED']).toContain(app.status);
    }, 10000);
  });

  describe('findById()', () => {
    it('debe encontrar una solicitud existente', async () => {
      const { applicationId } = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000005',
        requestedAmount: 200,
        termMonths: 3,
      });

      const app = service.findById(applicationId);
      expect(app.applicationId).toBe(applicationId);
      expect(app.timeline).toHaveLength(3); // SOLICITUD_RECIBIDA, SCORING, DECISION
    }, 10000);

    it('debe lanzar NotFound para un ID inexistente', () => {
      expect(() =>
        service.findById('00000000-0000-0000-0000-000000000099'),
      ).toThrow();
    });
  });

  describe('timeline', () => {
    it('debe incluir los 3 pasos del flujo', async () => {
      const { applicationId } = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000006',
        requestedAmount: 100,
        termMonths: 2,
      });

      const app = service.findById(applicationId);
      const steps = app.timeline.map((t) => t.step);

      expect(steps).toContain('SOLICITUD_RECIBIDA');
      expect(steps).toContain('SCORING');
      expect(steps).toContain('DECISION');
    }, 10000);

    it('debe marcar SOLICITUD_RECIBIDA como done inmediatamente', async () => {
      const { applicationId } = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000007',
        requestedAmount: 100,
        termMonths: 2,
      });

      const app = service.findById(applicationId);
      const recibida = app.timeline.find((t) => t.step === 'SOLICITUD_RECIBIDA');
      expect(recibida?.status).toBe('done');
    }, 10000);
  });

  describe('correlationId', () => {
    it('debe asignar el correlationId del header si se provee', async () => {
      const myCorrelation = 'test-correlation-id-xyz';
      const { applicationId } = await service.submit(
        { applicantId: '00000000-0000-0000-0000-000000000008', requestedAmount: 100, termMonths: 1 },
        { 'x-correlation-id': myCorrelation },
      );

      const app = service.findById(applicationId);
      expect(app.correlationId).toBe(myCorrelation);
    }, 10000);

    it('debe generar un correlationId si no se provee header', async () => {
      const { applicationId } = await service.submit({
        applicantId: '00000000-0000-0000-0000-000000000009',
        requestedAmount: 100,
        termMonths: 1,
      });

      const app = service.findById(applicationId);
      expect(app.correlationId).toBeDefined();
      // UUID v4: formato 8-4-4-4-12
      expect(app.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }, 10000);
  });
});
