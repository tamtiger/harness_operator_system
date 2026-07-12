import { vi, describe, it, expect, beforeEach } from 'vitest';
import { startMcpServer } from '../src/adapters/mcp/server';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('M9 MCP Adapter', () => {
  let mockPlatform: any;
  let server: any;

  beforeEach(async () => {
    mockPlatform = {
      run: vi.fn().mockResolvedValue({ status: 'COMPLETED', results: [] }),
      validate: vi.fn().mockResolvedValue({ valid: true }),
      listProposals: vi.fn().mockResolvedValue([]),
      submitProposal: vi.fn().mockResolvedValue({ id: 'PROP-1', status: 'SUBMITTED' }),
      orchestrator: {
        gov: {
          proposals: {
            submit: vi.fn().mockReturnValue({ id: 'PROP-1', status: 'SUBMITTED' })
          }
        }
      }
    };

    server = await startMcpServer(mockPlatform);
  });

  it('should list exactly 4 tools and exclude approve', async () => {
    // Retrieve the list tools handler
    const listHandler = (server as any)._requestHandlers.get('tools/list');
    expect(listHandler).toBeDefined();

    const res = await listHandler({ method: 'tools/list' });
    expect(res.tools).toHaveLength(4);

    const names = res.tools.map((t: any) => t.name);
    expect(names).toContain('harness_run');
    expect(names).toContain('harness_validate');
    expect(names).toContain('harness_proposal_list');
    expect(names).toContain('harness_proposal_submit');
    expect(names).not.toContain('harness_proposal_approve');
  });

  it('should call harness_run correctly', async () => {
    const callHandler = (server as any)._requestHandlers.get('tools/call');
    expect(callHandler).toBeDefined();

    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'harness_run',
        arguments: { description: 'test task' }
      }
    });

    expect(res.isError).toBe(false);
    expect(mockPlatform.run).toHaveBeenCalledWith({
      description: 'test task',
      workingDirectory: expect.any(String)
    });
    
    const content = JSON.parse(res.content[0].text);
    expect(content.status).toBe('COMPLETED');
  });

  it('should return error if description is missing in harness_run', async () => {
    const callHandler = (server as any)._requestHandlers.get('tools/call');
    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'harness_run',
        arguments: {}
      }
    });

    expect(res.isError).toBe(true);
    const content = JSON.parse(res.content[0].text);
    expect(content.error).toContain('Missing required argument');
  });

  it('should call harness_validate correctly', async () => {
    const callHandler = (server as any)._requestHandlers.get('tools/call');
    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'harness_validate',
        arguments: { root: '/dummy/path' }
      }
    });

    expect(res.isError).toBe(false);
    expect(mockPlatform.validate).toHaveBeenCalledWith('/dummy/path');
  });

  it('should call harness_proposal_list correctly', async () => {
    const callHandler = (server as any)._requestHandlers.get('tools/call');
    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'harness_proposal_list',
        arguments: { status: 'SUBMITTED' }
      }
    });

    expect(res.isError).toBe(false);
    expect(mockPlatform.listProposals).toHaveBeenCalledWith({ status: 'SUBMITTED' });
  });

  it('should call harness_proposal_submit correctly', async () => {
    const callHandler = (server as any)._requestHandlers.get('tools/call');
    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'harness_proposal_submit',
        arguments: { id: 'PROP-1' }
      }
    });

    expect(res.isError).toBe(false);
    expect(mockPlatform.orchestrator.gov.proposals.submit).toHaveBeenCalledWith('PROP-1');
  });
});
