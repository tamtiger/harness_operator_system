import { CapabilityRegistry } from '../../shared/contracts/services';
import { CapabilityDefinition } from '../../shared/types/assets';
import { CapabilityResult } from '../../shared/types/capability';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityId } from '../../shared/types/primitives';
import { CapabilityImpl } from './types';
import { CapabilityValidator } from '../validation/CapabilityValidator';
import { capError } from '../../shared/errors/factories';
import { HarnessError } from '../../shared/errors/HarnessError';
import Ajv from 'ajv';

export class CapabilityRegistryImpl implements CapabilityRegistry {
  private registrations = new Map<CapabilityId, { def: CapabilityDefinition; impl: CapabilityImpl }>();
  private ajv = new Ajv();

  register(def: CapabilityDefinition, impl: CapabilityImpl): void {
    CapabilityValidator.validate(def);
    this.registrations.set(def.capabilityId, { def, impl });
  }

  unregister(id: CapabilityId): void {
    this.registrations.delete(id);
  }

  isRegistered(id: CapabilityId): boolean {
    return this.registrations.has(id);
  }

  resolve(id: CapabilityId): CapabilityImpl {
    const reg = this.registrations.get(id);
    if (!reg) {
      throw capError('CAP_001', { capability: id });
    }
    return reg.impl;
  }

  getDefinition(id: CapabilityId): CapabilityDefinition {
    const reg = this.registrations.get(id);
    if (!reg) {
      throw capError('CAP_001', { capability: id });
    }
    return reg.def;
  }

  list(): CapabilityDefinition[] {
    return Array.from(this.registrations.values()).map(r => r.def);
  }

  async invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult> {
    const start = Date.now();
    let def: CapabilityDefinition;
    let impl: CapabilityImpl;

    try {
      const reg = this.registrations.get(id);
      if (!reg) {
        throw capError('CAP_001', { capability: id });
      }
      def = reg.def;
      impl = reg.impl;
    } catch (err: any) {
      return {
        capabilityId: id,
        success: false,
        error: err instanceof HarnessError ? err : capError('CAP_001', { capability: id }),
        durationMs: Date.now() - start
      };
    }

    try {
      // 2. Validate input schema
      const validateInput = this.ajv.compile(def.inputSchema || {});
      const valid = validateInput(input);
      if (!valid) {
        const errorsText = this.ajv.errorsText(validateInput.errors);
        throw capError('CAP_002', { capability: id, details: errorsText });
      }

      // 3. Verify permissions
      const requiredPerms = def.permissions || [];
      const grantedPerms = context.permissions || [];
      for (const perm of requiredPerms) {
        if (!grantedPerms.includes(perm)) {
          throw capError('CAP_004', { capability: id, permission: perm });
        }
      }

      // 4. Execute with timeout
      const timeout = def.timeout || 30000;
      const executePromise = impl.execute(context, input);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(capError('CAP_005', { capability: id, timeout }));
        }, timeout);
      });

      const output = await Promise.race([executePromise, timeoutPromise]);

      // 5. Validate output schema
      const validateOutput = this.ajv.compile(def.outputSchema || {});
      const outputValid = validateOutput(output);
      if (!outputValid) {
        const errorsText = this.ajv.errorsText(validateOutput.errors);
        throw capError('CAP_003', { capability: id, details: errorsText });
      }

      return {
        capabilityId: id,
        success: true,
        output,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      let finalError: HarnessError;
      if (err instanceof HarnessError) {
        finalError = err;
      } else {
        // Classify standard errors as CAP_006 (runtime error)
        finalError = capError('CAP_006', { capability: id, details: err.message });
      }
      return {
        capabilityId: id,
        success: false,
        error: finalError,
        durationMs: Date.now() - start
      };
    }
  }
}
