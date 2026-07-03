import { Command } from 'commander';
import { Task } from '@harness/contracts';

const program = new Command();

program
  .name('harness')
  .description('Universal Coding Harness CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Harness in the current project')
  .action(() => {
    console.log('Harness initialized successfully!');
  });

program
  .command('run <task>')
  .description('Run a development task')
  .action((taskDesc) => {
    const task: Task = {
      id: 'task_' + Date.now(),
      description: taskDesc,
      createdAt: new Date(),
      status: 'IDLE'
    };
    console.log(`Starting task: ${task.description} (${task.id})`);
  });

program.parse();
