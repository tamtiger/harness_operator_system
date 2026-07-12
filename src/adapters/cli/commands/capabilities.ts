import { CapabilityServiceImpl } from '../../../capability/service';
import { CapabilityDefinition } from '../../../shared/types/assets';

export function runCapabilities() {
  const service = new CapabilityServiceImpl();
  const list = service.list();

  console.log(`Built-in capabilities (${list.length}):`);
  list.forEach((def: CapabilityDefinition) => {
    console.log(`  ${def.capabilityId.padEnd(24)} — ${def.metadata.name}`);
  });
  
  process.exit(0);
}
