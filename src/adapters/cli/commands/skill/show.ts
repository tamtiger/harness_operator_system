import { createPlatformService } from '../../factory';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runSkillShow(id: string, options: any = {}) {
  const errFormatter = new ErrorFormatter();
  const platform = createPlatformService(options.cwd, options.harnessHome);

  try {
    if (!id) {
      console.error('✗ Missing required argument: skill name/ID');
      process.exit(2);
    }

    const runtimeCtx = await platform.previewContext({
      taskId: 'preview-skill-show',
      taskType: 'implementation',
      description: `Show skill ${id}`,
      tags: [],
      workingDirectory: '.'
    });

    const skill = (runtimeCtx.assets.skills || []).find(s => s.metadata.id === id);

    if (!skill) {
      console.error(`✗ Skill not found: ${id}`);
      process.exit(2);
    }

    console.log(skill.content);
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
