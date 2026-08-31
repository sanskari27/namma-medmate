#!/usr/bin/env node
/**
 * Stdio MCP front for https://stitch.googleapis.com/mcp.
 *
 * Cursor drops Google's tools/list (~320 KB, dangling #/$defs/ScreenInstance
 * on upload_design_md). This process answers stdio MCP and strips outputSchema
 * so the tool list is small and valid.
 */
const STITCH_URL = process.env.STITCH_HOST ?? 'https://stitch.googleapis.com/mcp';

if (!process.env.STITCH_API_KEY) {
  process.stderr.write(
    '[stitch-mcp-proxy] STITCH_API_KEY is missing. Copy .cursor/stitch.env.example to .cursor/stitch.env.\n',
  );
  process.exit(1);
}

let buffer = Buffer.alloc(0);
let ioMode = 'framed';

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  flushIncoming().catch((err) => {
    process.stderr.write(
      `[stitch-mcp-proxy] ${err instanceof Error ? err.message : String(err)}\n`,
    );
  });
});

process.stdin.on('end', () => process.exit(0));

async function flushIncoming() {
  for (;;) {
    const framed = tryReadFramed();
    if (framed === 'need-more') return;
    if (framed) {
      ioMode = 'framed';
      await handleMessage(JSON.parse(framed.body));
      continue;
    }
    const ndjson = tryReadNdjson();
    if (ndjson === 'need-more') return;
    if (ndjson) {
      ioMode = 'ndjson';
      await handleMessage(JSON.parse(ndjson));
      continue;
    }
    return;
  }
}

function tryReadFramed() {
  const sep = buffer.indexOf('\r\n\r\n');
  if (sep === -1) return null;
  const header = buffer.subarray(0, sep).toString('utf8');
  const match = /Content-Length:\s*(\d+)/i.exec(header);
  if (!match) {
    buffer = buffer.subarray(sep + 4);
    return null;
  }
  const length = Number(match[1]);
  const bodyStart = sep + 4;
  if (buffer.length < bodyStart + length) return 'need-more';
  const body = buffer.subarray(bodyStart, bodyStart + length).toString('utf8');
  buffer = buffer.subarray(bodyStart + length);
  return { body };
}

function tryReadNdjson() {
  const nl = buffer.indexOf('\n');
  if (nl === -1) return buffer.length > 0 && buffer[0] === 0x7b ? 'need-more' : null;
  const line = buffer.subarray(0, nl).toString('utf8').trim();
  buffer = buffer.subarray(nl + 1);
  return line.startsWith('{') ? line : null;
}

async function handleMessage(message) {
  if (!message || typeof message !== 'object') return;
  if (message.method && message.id == null) return;

  if (message.method === 'initialize') {
    write({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'stitch-mcp-proxy', version: '1.0.0' },
      },
    });
    return;
  }

  if (message.method === 'ping') {
    write({ jsonrpc: '2.0', id: message.id, result: {} });
    return;
  }

  if (message.method === 'resources/list') {
    write({ jsonrpc: '2.0', id: message.id, result: { resources: [] } });
    return;
  }

  if (message.method === 'prompts/list') {
    write({ jsonrpc: '2.0', id: message.id, result: { prompts: [] } });
    return;
  }

  if (message.method === 'tools/list' || message.method === 'tools/call') {
    try {
      const upstream = await stitchRpc(message);
      write(message.method === 'tools/list' ? stripOutputSchemas(upstream) : upstream);
    } catch (err) {
      write({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
    return;
  }

  write({
    jsonrpc: '2.0',
    id: message.id,
    error: { code: -32601, message: `Method not found: ${message.method}` },
  });
}

async function stitchRpc(message) {
  const res = await fetch(STITCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'X-Goog-Api-Key': process.env.STITCH_API_KEY,
    },
    body: JSON.stringify(message),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stitch HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  if (text.startsWith('event:') || text.startsWith('data:')) {
    const dataLine = text.split('\n').find((line) => line.startsWith('data:'));
    if (!dataLine) throw new Error('Stitch SSE response had no data line');
    return JSON.parse(dataLine.slice(5).trim());
  }
  return JSON.parse(text);
}

function stripOutputSchemas(message) {
  const tools = message?.result?.tools;
  if (!Array.isArray(tools)) return message;
  return {
    ...message,
    result: {
      ...message.result,
      tools: tools.map((tool) => {
        if (!tool || typeof tool !== 'object') return tool;
        const { outputSchema: _outputSchema, ...rest } = tool;
        return rest;
      }),
    },
  };
}

function write(message) {
  const json = JSON.stringify(message);
  if (ioMode === 'ndjson') {
    process.stdout.write(`${json}\n`);
    return;
  }
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
}
