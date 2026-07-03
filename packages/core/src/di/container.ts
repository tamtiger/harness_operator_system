export class Container {
  private instances = new Map<string, any>();
  private factories = new Map<string, { constructor: any; deps: string[]; singleton: boolean }>();

  public registerInstance<T>(name: string, instance: T): void {
    this.instances.set(name, instance);
  }

  public registerSingleton(name: string, constructor: any, deps: string[] = []): void {
    this.factories.set(name, { constructor, deps, singleton: true });
  }

  public registerTransient(name: string, constructor: any, deps: string[] = []): void {
    this.factories.set(name, { constructor, deps, singleton: false });
  }

  public resolve<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found in container`);
    }

    const resolvedDeps = factory.deps.map(dep => this.resolve(dep));
    const instance = new factory.constructor(...resolvedDeps);

    if (factory.singleton) {
      this.instances.set(name, instance);
    }

    return instance;
  }
}
