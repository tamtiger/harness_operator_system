import { IClock } from '@harness/contracts';

export class SystemClock implements IClock {
  public now(): Date {
    return new Date();
  }
}
