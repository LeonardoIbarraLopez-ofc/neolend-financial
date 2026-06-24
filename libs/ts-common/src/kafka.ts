import { Kafka, type Producer, type Consumer } from 'kafkajs';

/**
 * Restricción mínima: el bus solo necesita el correlationId para particionar.
 * El tipo concreto del sobre vive en @neolend/ts-events; usando un genérico se
 * evita acoplar ts-common con ts-events y se acepta cualquier envelope válido.
 */
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
