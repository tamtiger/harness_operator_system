import { ExecutionPlan, ExecutionStep } from '../../shared/types/execution';
import { execError } from '../../shared/errors/factories';

export class StepScheduler {
  schedule(plan: ExecutionPlan): ExecutionStep[] {
    const steps = plan.steps;
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const stepMap = new Map<string, ExecutionStep>();

    // Initialize maps
    steps.forEach(step => {
      adj.set(step.stepId, []);
      inDegree.set(step.stepId, 0);
      stepMap.set(step.stepId, step);
    });

    // Build graph and calculate in-degrees
    steps.forEach(step => {
      const deps = step.dependsOn || [];
      deps.forEach(dep => {
        if (!stepMap.has(dep)) {
          throw execError('EXEC_009', { stepId: step.stepId, dep });
        }
        adj.get(dep)!.push(step.stepId);
        inDegree.set(step.stepId, inDegree.get(step.stepId)! + 1);
      });
    });

    // Kahn's algorithm (BFS topological sort)
    const queue: string[] = [];
    inDegree.forEach((deg, node) => {
      if (deg === 0) queue.push(node);
    });

    const order: ExecutionStep[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(stepMap.get(u)!);

      const neighbors = adj.get(u) || [];
      neighbors.forEach(v => {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }

    if (order.length !== steps.length) {
      // Find remaining steps that form cycle
      const cycleSteps = Array.from(inDegree.keys()).filter(k => inDegree.get(k)! > 0);
      throw execError('EXEC_009', { stepId: cycleSteps.join(','), dep: 'cycle' });
    }

    // Assign sorted order index to steps
    return order.map((step, idx) => ({
      ...step,
      order: idx + 1
    }));
  }
}
