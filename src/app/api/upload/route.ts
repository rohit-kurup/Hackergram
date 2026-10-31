import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { authed, HttpError, ok } from "@/lib/api";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX = 5 * 1024 * 1024;

/**
 * Image upload to ./public/uploads (local disk). For production, swap this for
 * Supabase Storage or S3 — the client only depends on the returned URL.
 */
export const POST = authed(
  async (req) => {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file");
    const ext = TYPES[file.type];
    if (!ext) throw new HttpError(400, "Only PNG, JPG, WEBP or GIF images");
    if (file.size > MAX) throw new HttpError(400, "Images must be under 5 MB");
    const buf = Buffer.from(await file.arrayBuffer());
    // Verify magic bytes, not just the declared MIME type.
    const sig = buf.subarray(0, 12).toString("hex");
    const valid = sig.startsWith("89504e47") || sig.startsWith("ffd8ff") || sig.startsWith("47494638") || (sig.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP");
    if (!valid) throw new HttpError(400, "That file doesn't look like an image");
    const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    return ok({ url: `/uploads/${name}` });
  },
  { limit: 20 },
);
