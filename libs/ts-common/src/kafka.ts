import { Kafka, type Producer, type Consumer } from 'kafkajs';
import type { EventEnvelope } from '@neolend/ts-events';

/**
 * Cliente compartido del bus de eventos (Redpanda, API Kafka).
 * Encapsula publish/subscribe con el envelope estándar.
 */
export class EventBus {
  private readonly kafka: Kafka;
  private producer?: Producer;

  constructor(
    private readonly service: string,
    brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  ) {
    this.kafka = new Kafka({ clientId: service, brokers });
  }

  async publish<T>(topic: string, envelope: EventEnvelope<T>): Promise<void> {
    this.producer ??= this.kafka.producer();
    await this.producer.connect();
    await this.producer.send({
      topic,
      messages: [{ key: envelope.correlationId, value: JSON.stringify(envelope) }],
    });
  }

  /** Suscripción idempotente: el handler debe deduplicar por envelope.eventId. */
  async subscribe<T>(
    topics: string[],
    groupId: string,
    handler: (envelope: EventEnvelope<T>) => Promise<void>,
  ): Promise<Consumer> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        await handler(JSON.parse(message.value.toString()) as EventEnvelope<T>);
      },
    });
    return consumer;
  }
}
