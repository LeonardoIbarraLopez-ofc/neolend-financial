import { Kafka, type Producer, type Consumer } from 'kafkajs';

/**
 * Sobre estándar de evento (forma genérica). La definición canónica vive en
 * @neolend/ts-events; se exporta aquí también para consumidores que solo
 * dependen de ts-common, sin acoplar las libs entre sí.
 */
export interface EventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  correlationId: string;
  producer: string;
  occurredAt?: string;
  causationId?: string;
  schemaVersion?: number;
  payload: T;
}

/** Restricción mínima: el bus solo necesita el correlationId para particionar. */
type WithCorrelation = { correlationId: string };

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

  async publish<E extends WithCorrelation>(topic: string, envelope: E): Promise<void> {
    this.producer ??= this.kafka.producer();
    await this.producer.connect();
    await this.producer.send({
      topic,
      messages: [{ key: envelope.correlationId, value: JSON.stringify(envelope) }],
    });
  }

  /** Suscripción idempotente: el handler debe deduplicar por envelope.eventId. */
  async subscribe<E>(
    topics: string[],
    groupId: string,
    handler: (envelope: E) => Promise<void>,
  ): Promise<Consumer> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        await handler(JSON.parse(message.value.toString()) as E);
      },
    });
    return consumer;
  }
}
