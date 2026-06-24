"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const kafkajs_1 = require("kafkajs");
/**
 * Cliente compartido del bus de eventos (Redpanda, API Kafka).
 * Encapsula publish/subscribe con el envelope estándar.
 */
class EventBus {
    service;
    kafka;
    producer;
    constructor(service, brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',')) {
        this.service = service;
        this.kafka = new kafkajs_1.Kafka({ clientId: service, brokers });
    }
    async publish(topic, envelope) {
        this.producer ??= this.kafka.producer();
        await this.producer.connect();
        await this.producer.send({
            topic,
            messages: [{ key: envelope.correlationId, value: JSON.stringify(envelope) }],
        });
    }
    /** Suscripción idempotente: el handler debe deduplicar por envelope.eventId. */
    async subscribe(topics, groupId, handler) {
        const consumer = this.kafka.consumer({ groupId });
        await consumer.connect();
        for (const topic of topics) {
            await consumer.subscribe({ topic, fromBeginning: false });
        }
        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value)
                    return;
                await handler(JSON.parse(message.value.toString()));
            },
        });
        return consumer;
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=kafka.js.map