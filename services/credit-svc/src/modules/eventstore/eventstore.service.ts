import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditEventEntity } from './credit-event.entity';

@Injectable()
export class EventStoreService {
  constructor(
    @InjectRepository(CreditEventEntity)
    private readonly eventRepo: Repository<CreditEventEntity>,
  ) {}

  async appendEvent(event: Omit<CreditEventEntity, 'globalSeq' | 'occurredAt'>): Promise<CreditEventEntity> {
    try {
      const newEvent = this.eventRepo.create(event);
      return await this.eventRepo.save(newEvent);
    } catch (error: any) {
      // Capturar violación de constraint única (aggregate_id + aggregate_ver)
      if (error.code === '23505') {
        throw new ConflictException(
          `Error de concurrencia optimista para el agregado ${event.aggregateId} en la versión ${event.aggregateVer}`
        );
      }
      throw error;
    }
  }

  async getEventsByAggregate(aggregateId: string): Promise<CreditEventEntity[]> {
    return this.eventRepo.find({
      where: { aggregateId },
      order: { aggregateVer: 'ASC' },
    });
  }
}