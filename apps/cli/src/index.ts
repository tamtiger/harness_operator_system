import { Command } from 'commander';
import { Task } from '@harness/contracts';
import { ApplicationHost } from '@harness/core';
import { PhysicalFileSystem } from '@harness/shared';
import { LayeredConfiguration } from '@harness/core';
import { SystemClock } from '@harness/shared';
import { StructuredLogger } from '@harness/core';

const program = new Command();

program
  .name('harness')
  .description('Universal Coding Harness CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Harness in the current project')
  .action(async () => {
    const host = new ApplicationHost();
    
    host.registerServiceSingleton('FileSystem', PhysicalFileSystem, []);
    host.registerServiceSingleton('Clock', SystemClock, []);
    host.registerServiceInstance('Logger', new StructuredLogger());
    
    try {
      await host.start();
      console.log('Harness initialized successfully!');
      await host.stop();
    } catch (err) {
      console.error('Initialization failed:', err);
      process.exit(1);
    }
  });

program
  .command('run <task>')
  .description('Run a development task')
  .action(async (taskDesc) => {
    const host = new ApplicationHost();
    
    host.registerServiceSingleton('FileSystem', PhysicalFileSystem, []);
    host.registerServiceSingleton('Clock', SystemClock, []);
    host.registerServiceInstance('Logger', new StructuredLogger());
    
    try {
      await host.start();
      const task: Task = {
        id: 'task_' + Date.now(),
        description: taskDesc,
        createdAt: new Date(),
        status: 'IDLE'
      };
      console.log(`Starting task: ${task.description} (${task.id})`);
      await host.stop();
    } catch (err) {
      console.error('Task execution failed:', err);
      process.exit(1);
    }
  });

program.parse();
