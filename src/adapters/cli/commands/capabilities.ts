import { createPlatformService } from '../factory';

export async function runCapabilities(options?: { cwd?: string; harnessHome?: string }) {
  const platform = createPlatformService(options?.cwd, options?.harnessHome);
  const list = await platform.listCapabilities();

  console.log(`Built-in capabilities (${list.length}):`);
  list.forEach(def => {
    console.log(`  ${def.capabilityId.padEnd(24)} \u2014 ${def.metadata.name}`);
  });

  process.exit(0);
}