import { type Consumer } from 'kafkajs';
/**
 * Forma mínima del sobre estándar que necesita el bus (la definición completa
 * vive en @neolend/ts-events). Se mantiene local para no acoplar las libs.
 */
export interface EventEnvelope<T = unknown> {
    eventId: string;
    eventType: string;
    correlationId: string;
    producer: string;
    payload: T;
    [key: string]: unknown;
}
/**
 * Cliente compartido del bus de eventos (Redpanda, API Kafka).
 * Encapsula publish/subscribe con el envelope estándar.
 */
export declare class EventBus {
    private readonly service;
    private readonly kafka;
    private producer?;
    constructor(service: string, brokers?: string[]);
    publish<T>(topic: string, envelope: EventEnvelope<T>): Promise<void>;
    /** Suscripción idempotente: el handler debe deduplicar por envelope.eventId. */
    subscribe<T>(topics: string[], groupId: string, handler: (envelope: EventEnvelope<T>) => Promise<void>): Promise<Consumer>;
}
