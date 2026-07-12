import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PlatformService } from '../../shared/contracts/services';
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

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
    const { name, arguments: args } = request.params;
    
    try {
      if (name === 'harness_run') {
        const description = (args as any)?.description;
        if (!description) {
          return formatter.toToolResult({ error: 'Missing required argument: description' }, true);
        }
        const res = await platform.run({
          description,
          workingDirectory: process.cwd()
        });
        return formatter.toToolResult(res);
      }

      if (name === 'harness_validate') {
        const root = (args as any)?.root || process.cwd();
        const res = await platform.validate(root);
        return formatter.toToolResult(res);
      }

      if (name === 'harness_proposal_list') {
        const status = (args as any)?.status;
        const res = await platform.listProposals({ status });
        return formatter.toToolResult(res);
      }

      if (name === 'harness_proposal_submit') {
        const id = (args as any)?.id;
        if (!id) {
          return formatter.toToolResult({ error: 'Missing required argument: id' }, true);
        }
        const gov = (platform as any).orchestrator?.gov;
        if (!gov) {
          return formatter.toToolResult({ error: 'Governance service not available' }, true);
        }
        const res = gov.proposals.submit(id);
        return formatter.toToolResult(res);
      }

      throw new Error(`Tool not found: ${name}`);
    } catch (err: any) {
      return formatter.toErrorResult(err);
    }
  });

  return server;
}
