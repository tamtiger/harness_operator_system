import { IEventBus, EventEnvelope, IClock } from '@harness/contracts';
import { EventEmitter } from 'events';

export class LocalEventBus implements IEventBus {
  public readonly serviceName = 'EventBus';
  private emitter = new EventEmitter();

  constructor(private readonly clock: IClock) {}

  public publish<T>(event: string, payload: T, taskId?: string): void {
    const envelope: EventEnvelope<T> = {
      event,
      version: 'v1',
      timestamp: this.clock.now().toISOString(),
      taskId,
      payload
    };
    this.emitter.emit(event, envelope);
  }

  public subscribe<T>(event: string, handler: (envelope: EventEnvelope<T>) => void): void {
    this.emitter.on(event, handler);
  }

  public unsubscribe<T>(event: string, handler: (envelope: EventEnvelope<T>) => void): void {
    this.emitter.off(event, handler);
  }
}
