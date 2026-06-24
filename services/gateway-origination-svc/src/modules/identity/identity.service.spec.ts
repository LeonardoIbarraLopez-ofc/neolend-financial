import { Test, TestingModule } from '@nestjs/testing';
import { IdentityService } from './identity.service';

// Mock de la variable de entorno AES_MASTER_KEY para pruebas
process.env.AES_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PII_HMAC_SALT = 'test-salt';

/**
 * Tests unitarios del IdentityService (Tarea D2.2 — KYC + cifrado AES).
 */
describe('IdentityService', () => {
  let service: IdentityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentityService],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('debe crear un solicitante y retornar applicantId', () => {
      const applicant = service.create({
        fullName: 'Juan Pérez',
        documentNumber: '12345678',
        documentType: 'CC',
        email: 'juan@test.com',
      });

      expect(applicant.applicantId).toBeDefined();
      expect(applicant.fullName).toBe('Juan Pérez');
      expect(applicant.kycStatus).toBe('PENDING');
      expect(applicant.createdAt).toBeDefined();
    });

    it('debe cifrar el número de documento (no exponer en texto plano)', () => {
      const applicant = service.create({
        fullName: 'María López',
        documentNumber: '87654321',
        documentType: 'CC',
      });

      // El documentNumberEncrypted debe ser base64, no el número original
      expect(applicant.documentNumberEncrypted).not.toBe('87654321');
      expect(applicant.documentNumberEncrypted.length).toBeGreaterThan(10);
    });

    it('debe generar un hash HMAC para búsqueda', () => {
      const applicant = service.create({
        fullName: 'Carlos Ruiz',
        documentNumber: '11223344',
        documentType: 'CE',
      });

      expect(applicant.documentNumberHash).toBeDefined();
      expect(applicant.documentNumberHash).toHaveLength(64); // SHA-256 hex
    });

    it('debe generar applicantIds únicos para cada solicitud', () => {
      const a1 = service.create({
        fullName: 'A1',
        documentNumber: '11111111',
        documentType: 'CC',
      });
      const a2 = service.create({
        fullName: 'A2',
        documentNumber: '22222222',
        documentType: 'CC',
      });

      expect(a1.applicantId).not.toBe(a2.applicantId);
    });
  });

  describe('findById()', () => {
    it('debe encontrar un solicitante existente', () => {
      const created = service.create({
        fullName: 'Buscable',
        documentNumber: '99887766',
        documentType: 'PASSPORT',
      });

      const found = service.findById(created.applicantId);
      expect(found.applicantId).toBe(created.applicantId);
      expect(found.fullName).toBe('Buscable');
    });

    it('debe lanzar NotFound para un ID inexistente', () => {
      expect(() => service.findById('00000000-0000-0000-0000-000000000000')).toThrow();
    });
  });

  describe('processDocumentOcr()', () => {
    it('debe retornar resultado OCR y cambiar kycStatus a VERIFIED', () => {
      const applicant = service.create({
        fullName: 'OCR Test',
        documentNumber: '55667788',
        documentType: 'CC',
      });

      const ocr = service.processDocumentOcr(applicant.applicantId, Buffer.from('fake-image'));

      expect(ocr.confidence).toBeGreaterThanOrEqual(0.7);
      expect(ocr.processedAt).toBeDefined();

      const updated = service.findById(applicant.applicantId);
      expect(updated.kycStatus).toBe('VERIFIED');
    });

    it('debe lanzar error si el applicantId no existe', () => {
      expect(() =>
        service.processDocumentOcr(
          '00000000-0000-0000-0000-000000000000',
          Buffer.from(''),
        ),
      ).toThrow();
    });
  });
});
