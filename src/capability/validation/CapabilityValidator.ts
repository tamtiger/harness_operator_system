import { CapabilityDefinition } from '../../shared/types/assets';
import { capError } from '../../shared/errors/factories';
import Ajv from 'ajv';

export class CapabilityValidator {
  private static ajv = new Ajv();

  static validate(def: CapabilityDefinition): void {
    if (!def.capabilityId || !/^\w+(?:\.\w+)+$/.test(def.capabilityId)) {
      throw capError('CAP_008', { details: `Invalid capability ID: ${def.capabilityId}` });
    }

    try {
      this.ajv.compile(def.inputSchema || {});
    } catch (e: any) {
      throw capError('CAP_008', { details: `Invalid input schema for ${def.capabilityId}: ${e.message}` });
    }

    try {
      this.ajv.compile(def.outputSchema || {});
    } catch (e: any) {
      throw capError('CAP_008', { details: `Invalid output schema for ${def.capabilityId}: ${e.message}` });
    }

    if (def.permissions) {
      if (!Array.isArray(def.permissions)) {
        throw capError('CAP_008', { details: `Permissions must be an array for ${def.capabilityId}` });
      }
    }
  }
}
