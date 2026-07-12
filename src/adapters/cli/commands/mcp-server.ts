import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createPlatformService } from '../factory';
import { startMcpServer } from '../../mcp/server';

export async function runMcpServer(options: any = {}) {
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const server = await startMcpServer(service);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err: any) {
    console.error(`Failed to start MCP server: ${err.message}`);
    process.exit(2);
  }
}
