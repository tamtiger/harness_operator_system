import { AssetCollection, EffectiveAssetCollection, Asset } from '../../shared/types/assets';

export class ResolutionEngine {
  resolve(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection {
    const conflicts: any[] = [];

    // Helper for override logic
    const resolveOverride = <T extends Asset>(sharedList: T[], localList: T[]): T[] => {
      const mergedMap = new Map<string, T>();
      sharedList.forEach(asset => mergedMap.set(asset.metadata.id, asset));
      
      localList.forEach(localAsset => {
        const id = localAsset.metadata.id;
        if (mergedMap.has(id)) {
          const sharedAsset = mergedMap.get(id)!;
          conflicts.push({
            assetId: id,
            type: localAsset.metadata.type,
            strategy: 'Override',
            sharedVersion: sharedAsset.metadata.version,
            localVersion: localAsset.metadata.version,
            resolution: 'Local overrides shared',
            timestamp: new Date().toISOString()
          });
          console.warn(`[WARNING] Local asset overrides shared asset: ${id}`);
        }
        mergedMap.set(id, localAsset);
      });

      return Array.from(mergedMap.values());
    };

    // Helper for Merge (knowledge)
    const resolveMerge = <T extends Asset>(sharedList: T[], localList: T[]): T[] => {
      const result: T[] = [...sharedList];
      const sharedIds = new Set(sharedList.map(a => a.metadata.id));

      localList.forEach(localAsset => {
        const id = localAsset.metadata.id;
        if (sharedIds.has(id)) {
          // If duplicate knowledge ID, append suffix to local ID
          const modifiedAsset = {
            ...localAsset,
            metadata: {
              ...localAsset.metadata,
              id: `${id}.local`
            }
          };
          conflicts.push({
            assetId: id,
            type: localAsset.metadata.type,
            strategy: 'Merge',
            sharedVersion: sharedList.find(a => a.metadata.id === id)!.metadata.version,
            localVersion: localAsset.metadata.version,
            resolution: `Appended local version as ${id}.local`,
            timestamp: new Date().toISOString()
          });
          result.push(modifiedAsset);
        } else {
          result.push(localAsset);
        }
      });

      return result;
    };

    // Helper for Merge (hooks) — dedup by ID, local overrides shared
    const resolveHookMerge = <T extends Asset>(sharedList: T[], localList: T[]): T[] => {
      const mergedMap = new Map<string, T>();
      sharedList.forEach(asset => mergedMap.set(asset.metadata.id, asset));
      localList.forEach(localAsset => {
        mergedMap.set(localAsset.metadata.id, localAsset);
      });
      return Array.from(mergedMap.values());
    };

    // Helper for Registry (capabilities)
    const resolveRegistry = <T extends Asset>(sharedList: T[], localList: T[]): T[] => {
      // Registry strategy - include all, caller resolves precedence.
      // We return both. Precedence order: local overrides shared
      const mergedMap = new Map<string, T>();
      sharedList.forEach(asset => mergedMap.set(asset.metadata.id, asset));
      localList.forEach(asset => {
        const id = asset.metadata.id;
        if (mergedMap.has(id)) {
          const sharedAsset = mergedMap.get(id)!;
          conflicts.push({
            assetId: id,
            type: asset.metadata.type,
            strategy: 'Registry',
            sharedVersion: sharedAsset.metadata.version,
            localVersion: asset.metadata.version,
            resolution: 'Local capability takes precedence in registry lookup',
            timestamp: new Date().toISOString()
          });
        }
        mergedMap.set(id, asset);
      });
      return Array.from(mergedMap.values());
    };

    const resolved: AssetCollection = {
      rules: resolveOverride(shared.rules, local.rules),
      prompts: resolveOverride(shared.prompts, local.prompts),
      templates: resolveOverride(shared.templates, local.templates),
      workflows: resolveOverride(shared.workflows, local.workflows),
      knowledge: resolveMerge(shared.knowledge, local.knowledge),
      hooks: resolveHookMerge(shared.hooks, local.hooks),
      capabilities: resolveRegistry(shared.capabilities, local.capabilities)
    };

    return Object.freeze({
      ...resolved,
      conflicts,
      resolvedAt: new Date().toISOString()
    }) as any;
  }
}
