import { PlatformService, RepositoryService } from '../shared/contracts/services';
import { PlatformOrchestrator } from './orchestration/PlatformOrchestrator';
import { TaskRequest, ExecutionResult, TaskState } from '../shared/types/execution';
import { InstallConfig, InstallResult, UpdateConfig, UpdateResult, SyncConfig, SyncResult, PublishRequest, PublishResult, DiagnosticReport, PlatformStatus, ValidationResult, ProposalRequest, ProposalFilter } from '../shared/types/platform';
import { Proposal } from '../shared/types/governance';
import { ProposalId } from '../shared/types/primitives';

export class PlatformServiceImpl implements PlatformService {
  constructor(
    private orchestrator: PlatformOrchestrator,
    private repoService: RepositoryService
  ) {}

  async run(request: TaskRequest): Promise<ExecutionResult> {
    return this.orchestrator.run(request);
  }

  async install(config: InstallConfig): Promise<InstallResult> {
    return this.orchestrator.installer.install(config);
  }

  async update(config: UpdateConfig): Promise<UpdateResult> {
    return this.orchestrator.updater.update(config);
  }

  async sync(config: SyncConfig): Promise<SyncResult> {
    return this.orchestrator.synchronizer.sync(config);
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    return this.orchestrator.publisher.publish(request);
  }

  async doctor(): Promise<DiagnosticReport> {
    return this.orchestrator.doctor.runChecks();
  }

  async validate(root: string): Promise<ValidationResult> {
    return this.repoService.validate({ path: root, hasGit: false, discoveredAt: '' });
  }

  async status(): Promise<PlatformStatus> {
    return {
      status: 'active',
      version: '0.0.6',
      uptimeMs: process.uptime() * 1000
    };
  }

  async submitProposal(request: ProposalRequest): Promise<Proposal> {
    return this.orchestrator.gov.submitProposal(request);
  }

  async listProposals(filter: ProposalFilter): Promise<Proposal[]> {
    return this.orchestrator.gov.listProposals(filter);
  }

  async approveProposal(id: ProposalId, reviewer: string, comments: string = ''): Promise<Proposal> {
    const prop = this.orchestrator.gov.getProposal(id);
    if (prop.status === 'SUBMITTED') {
      await this.orchestrator.gov.review(id, reviewer);
    }
    return this.orchestrator.gov.approve(id, reviewer, comments);
  }
}
