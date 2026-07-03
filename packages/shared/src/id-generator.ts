import { IIdGenerator } from '@harness/contracts';
import { randomBytes } from 'crypto';

export class NanoidGenerator implements IIdGenerator {
  public generate(prefix?: string): string {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const bytes = randomBytes(21);
    let id = '';
    for (let i = 0; i < 21; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return prefix ? `${prefix}_${id}` : id;
  }
}
