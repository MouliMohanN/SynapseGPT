import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export class McpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(
    private serverName: string,
    private serverVersion: string,
    private command: string,
    private args: string[]
  ) {}

  async connect() {
    if (this.client) return;

    this.transport = new StdioClientTransport({
      command: this.command,
      args: this.args,
    });

    this.client = new Client(
      {
        name: "synapse-gpt-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
  }

  async callTool(name: string, args: any) {
    if (!this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("Failed to connect to MCP server");
    }

    return this.client.callTool({
      name,
      arguments: args,
    });
  }

  async close() {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
    }
  }
}

// Singleton instance factory or manager could go here if needed
// For now, we'll instantiate on demand or let the caller manage it.
