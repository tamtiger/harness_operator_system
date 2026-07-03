export class Result<T, E = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: E
  ) {}

  public static ok<T, E>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  public static fail<T, E>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public getValueOrThrow(): T {
    if (!this.isSuccess) {
      throw this.error || new Error('Result failed without error');
    }
    return this.value!;
  }
}

export class HarnessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
