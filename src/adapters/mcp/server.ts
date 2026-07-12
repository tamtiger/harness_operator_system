import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PlatformService } from '../../shared/contracts/services';
import { ProposalStatus } from '../../shared/types/enums';
import { McpFormatter } from './formatter/McpFormatter';

export async function startMcpServer(platform: PlatformService): Promise<Server> {
  const server = new Server(
    { name: 'harness', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  const formatter = new McpFormatter();

  const runTool = {
    name: 'harness_run',
    description: 'Execute a task using Harness Platform',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Task description' },
        workflowId: { type: 'string', description: 'Optional workflow ID' },
      },
      required: ['description'],
    }
  };

  const validateTool = {
    name: 'harness_validate',
    description: 'Validate repository structure',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Root directory to validate' }
      }
    }
  };

  const proposalListTool = {
    name: 'harness_proposal_list',
    description: 'List knowledge proposals',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'PROMOTED'], description: 'Filter by status' },
      }
    }
  };

  const proposalSubmitTool = {
    name: 'harness_proposal_submit',
    description: 'Submit a proposal for review',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Proposal ID to submit' }
      },
      required: ['id']
    }
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [runTool, validateTool, proposalListTool, proposalSubmitTool]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const getArg = (key: string): unknown =>
      typeof args === 'object' && args !== null ? (args as Record<string, unknown>)[key] : undefined;
    
    try {
      if (name === 'harness_run') {
        const description = getArg('description');
        if (!description) {
          return formatter.toToolResult({ error: 'Missing required argument: description' }, true);
        }
        const res = await platform.run({
          description: String(description),
          workingDirectory: process.cwd()
        });
        return formatter.toToolResult(res);
      }

      if (name === 'harness_validate') {
        const root = getArg('root') || process.cwd();
        const res = await platform.validate(String(root));
        return formatter.toToolResult(res);
      }

      if (name === 'harness_proposal_list') {
        const rawStatus = getArg('status');
        const status = typeof rawStatus === 'string' && Object.values(ProposalStatus).includes(rawStatus as ProposalStatus)
          ? rawStatus as ProposalStatus
          : undefined;
        const res = await platform.listProposals({ status });
        return formatter.toToolResult(res);
      }

      if (name === 'harness_proposal_submit') {
        const id = getArg('id');
        if (!id) {
          return formatter.toToolResult({ error: 'Missing required argument: id' }, true);
        }
        const res = await platform.submitExistingProposal(String(id));
        return formatter.toToolResult(res);
      }

      throw new Error(`Tool not found: ${name}`);
    } catch (err: unknown) {
      return formatter.toErrorResult(err);
    }
  });

  return server;
}
