import { describe, it, expect, vi } from 'vitest';
import { CapabilityRegistry } from '../../packages/core/src/index.js';
import { ICapabilityProvider, ICapability, CapabilityContext } from '../../packages/contracts/src/index.js';
import { Result } from '../../packages/shared/src/index.js';

describe('Capability Registry Tests', () => {
  it('should register and resolve capabilities', () => {
    const registry = new CapabilityRegistry();
    
    const mockCap: ICapability = {
      descriptor: {
        id: 'mock-builder',
        name: 'Mock Builder',
        type: 'builder',
        version: '1.0.0'
      }
    };

    const mockProvider: ICapabilityProvider = {
      getCapabilities: () => [mockCap.descriptor],
      getCapability: (id) => id === 'mock-builder' ? mockCap : undefined
    };

    registry.registerProvider(mockProvider);
    
    const resolved = registry.resolve<ICapability>('builder');
    expect(resolved).toBe(mockCap);
  });

  it('should throw duplicate error in Phase 1 if registering same type', () => {
    const registry = new CapabilityRegistry();
    
    const mockCap1: ICapability = {
      descriptor: { id: 'mock-1', name: 'Mock 1', type: 'builder', version: '1.0.0' }
    };
    const mockCap2: ICapability = {
      descriptor: { id: 'mock-2', name: 'Mock 2', type: 'builder', version: '1.0.0' }
    };

    const provider1: ICapabilityProvider = {
      getCapabilities: () => [mockCap1.descriptor],
      getCapability: (id) => mockCap1
    };
    const provider2: ICapabilityProvider = {
      getCapabilities: () => [mockCap2.descriptor],
      getCapability: (id) => mockCap2
    };

    registry.registerProvider(provider1);
    
    try {
      registry.registerProvider(provider2);
      expect.fail('Should have thrown CAPABILITY_DUPLICATE error');
    } catch (err: any) {
      expect(err.code).toBe('CAPABILITY_DUPLICATE');
    }
  });

  it('should enforce timeout on execution', async () => {
    const registry = new CapabilityRegistry();
    const slowCap: ICapability = {
      descriptor: { id: 'slow', name: 'Slow', type: 'builder', version: '1.0.0', timeoutMs: 10 }
    };

    const result = await registry.executeSafe(slowCap, async () => {
      await new Promise(r => setTimeout(r, 100));
      return Result.ok(undefined);
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('timed out');
  });

  it('should isolate errors and prevent crashes', async () => {
    const registry = new CapabilityRegistry();
    const crashCap: ICapability = {
      descriptor: { id: 'crash', name: 'Crash', type: 'builder', version: '1.0.0' }
    };

    const result = await registry.executeSafe(crashCap, async () => {
      throw new Error('Unexpected plugin crash');
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('Unexpected plugin crash');
  });
});
