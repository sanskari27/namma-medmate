import type { PoolClient } from "pg";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function parseDataUrl(url: string): { type: string; bytes: Buffer } | null {
  const match = /^data:([^;,]+)?((?:;[^,]*)*),([\s\S]*)$/.exec(url);
  if (!match) return null;
  const type = match[1] || "application/octet-stream";
  const bytes = match[2].includes("base64") ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
  return { type, bytes };
}

async function putFile(client: PoolClient, pharmacyId: string, id: string, type: string, bytes: Buffer) {
  const bucket = process.env.S3_BUCKET;
  if (bucket) {
    const key = `${pharmacyId}/${id}`;
    await new S3Client({ region: process.env.AWS_REGION || "ap-south-1" }).send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: bytes, ContentType: type,
    }));
    await client.query("INSERT INTO files (id, pharmacy_id, content_type, s3_key) VALUES ($1,$2,$3,$4)", [id, pharmacyId, type, key]);
    return;
  }
  await client.query("INSERT INTO files (id, pharmacy_id, content_type, bytes) VALUES ($1,$2,$3,$4)", [id, pharmacyId, type, bytes]);
}

export async function absorbFiles<T>(client: PoolClient, pharmacyId: string, node: T): Promise<T> {
  if (typeof node === "string") {
    if (node.startsWith("/api/v1/files/")) return ("file:" + node.slice("/api/v1/files/".length)) as T;
    if (!node.startsWith("data:")) return node;
    const parsed = parseDataUrl(node);
    if (!parsed) return node;
    const id = crypto.randomUUID();
    await putFile(client, pharmacyId, id, parsed.type, parsed.bytes);
    return ("file:" + id) as T;
  }
  if (Array.isArray(node)) return Promise.all(node.map((item) => absorbFiles(client, pharmacyId, item))) as Promise<T>;
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) out[key] = await absorbFiles(client, pharmacyId, value);
  return out as T;
}

export function expandFiles<T>(node: T): T {
  if (typeof node === "string") return (node.startsWith("file:") ? "/api/v1/files/" + node.slice(5) : node) as T;
  if (Array.isArray(node)) return node.map((item) => expandFiles(item)) as T;
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) out[key] = expandFiles(value);
  return out as T;
}

export async function readFile(id: string, pharmacyId: string) {
  const { getPool } = await import("./db");
  const { rows } = await getPool().query("SELECT content_type, bytes, s3_key FROM files WHERE id = $1 AND pharmacy_id = $2", [id, pharmacyId]);
  const row = rows[0] as { content_type: string; bytes: Buffer | null; s3_key: string | null } | undefined;
  if (!row) return null;
  if (row.s3_key && process.env.S3_BUCKET) {
    const out = await new S3Client({ region: process.env.AWS_REGION || "ap-south-1" }).send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: row.s3_key }));
    const bytes = Buffer.from(await out.Body!.transformToByteArray());
    return { type: row.content_type, bytes };
  }
  return { type: row.content_type, bytes: row.bytes ?? Buffer.alloc(0) };
}
