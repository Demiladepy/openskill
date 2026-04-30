import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { q } from "../src/db/db";

const server = new Server({ name: "bounty-hunter-mcp", version: "0.1.0" }, { capabilities: { tools: {}, resources: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_bounties",
      description: "List bounties by optional status",
      inputSchema: {
        type: "object",
        properties: { status: { type: "string", enum: ["pending", "approved_for_payment", "rejected", "needs_manual_review", "run_failed"] } }
      }
    },
    {
      name: "get_bounty",
      description: "Get bounty by id",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
      name: "get_skill_profile",
      description: "Get contributor decision profile by GitHub username",
      inputSchema: { type: "object", properties: { githubUsername: { type: "string" } }, required: ["githubUsername"] }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {};

  if (req.params.name === "list_bounties") {
    const status = (args as { status?: string }).status ?? null;
    const rows = q.listBounties.all(status);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }
  if (req.params.name === "get_bounty") {
    const id = (args as { id: string }).id;
    const row = q.getBounty.get(id);
    return { content: [{ type: "text", text: JSON.stringify(row ?? null, null, 2) }] };
  }
  if (req.params.name === "get_skill_profile") {
    const githubUsername = (args as { githubUsername: string }).githubUsername;
    const row = q.skillProfile.get(githubUsername) ?? { github_username: githubUsername, total_runs: 0, approved_count: 0, rejected_count: 0, avg_confidence: 0 };
    return { content: [{ type: "text", text: JSON.stringify(row, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${req.params.name}`);
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const rows = q.listBounties.all(null) as Array<{ id: string; expected_author: string }>;
  const bountyResources = rows.map((r) => ({ uri: `bounty://${r.id}`, name: `Bounty ${r.id}`, mimeType: "application/json" }));
  const profiles = Array.from(new Set(rows.map((r) => r.expected_author))).map((u) => ({ uri: `profile://${u}`, name: `Profile ${u}`, mimeType: "application/json" }));
  return { resources: [...bountyResources, ...profiles] };
});

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  if (uri.startsWith("bounty://")) {
    const id = uri.replace("bounty://", "");
    const row = q.getBounty.get(id);
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(row ?? null, null, 2) }] };
  }
  if (uri.startsWith("profile://")) {
    const u = uri.replace("profile://", "");
    const row = q.skillProfile.get(u) ?? { github_username: u, total_runs: 0, approved_count: 0, rejected_count: 0, avg_confidence: 0 };
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(row, null, 2) }] };
  }
  throw new Error(`Unknown resource URI: ${uri}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
