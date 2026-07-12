import { PlatformServiceImpl } from '../../platform/service';

export function createPlatformService(rootPath?: string, sharedPath?: string): PlatformServiceImpl {
  return PlatformServiceImpl.create(rootPath, sharedPath);
}
