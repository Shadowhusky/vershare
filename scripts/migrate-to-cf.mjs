#!/usr/bin/env node
// Exports local data (sqlite + shares JSON + uploads) into:
//   migration-out/data.sql      — D1 inserts (users, upload_history, shares)
//   migration-out/r2-objects/   — staged R2 objects mirroring bucket keys
//   migration-out/r2-upload.sh  — wrangler put commands for every object
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const OUT = path.join(ROOT, "migration-out");
const OBJ = path.join(OUT, "r2-objects");

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OBJ, { recursive: true });

const q = (v) =>
  v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

const sql = [];
const db = new Database(path.join(DATA, "vershare.db"), { readonly: true });

for (const u of db.prepare("SELECT * FROM users").all()) {
  sql.push(
    `INSERT OR REPLACE INTO users (email, password_hash, salt, email_verified, verify_code, last_code_sent_at, created_at, wizard_seen) VALUES (${q(u.email)}, ${q(u.password_hash)}, ${q(u.salt)}, ${u.email_verified ?? 0}, ${q(u.verify_code)}, ${q(u.last_code_sent_at)}, ${q(u.created_at)}, ${u.wizard_seen ?? 0});`
  );
}

for (const h of db.prepare("SELECT * FROM upload_history").all()) {
  sql.push(
    `INSERT OR REPLACE INTO upload_history (share_id, user_email, share_type, title, file_name, file_size, created_at, expires_at) VALUES (${q(h.share_id)}, ${q(h.user_email)}, ${q(h.share_type)}, ${q(h.title)}, ${q(h.file_name)}, ${h.file_size ?? "NULL"}, ${q(h.created_at)}, ${q(h.expires_at)});`
  );
}

const uploads = [];
const sharesDir = path.join(DATA, "shares");
for (const f of fs.readdirSync(sharesDir).filter((f) => f.endsWith(".json"))) {
  const s = JSON.parse(fs.readFileSync(path.join(sharesDir, f), "utf-8"));
  const contentSize =
    s.content !== undefined ? Buffer.byteLength(s.content, "utf-8") : null;
  sql.push(
    `INSERT OR REPLACE INTO shares (id, type, title, language, file_name, file_size, mime_type, content_size, created_at, expires_at, created_by) VALUES (${q(s.id)}, ${q(s.type)}, ${q(s.title)}, ${q(s.language)}, ${q(s.fileName)}, ${s.fileSize ?? "NULL"}, ${q(s.mimeType)}, ${contentSize ?? "NULL"}, ${q(s.createdAt)}, ${q(s.expiresAt)}, ${q(s.createdBy)});`
  );

  if (s.content !== undefined) {
    const key = `content/${s.id}`;
    const dest = path.join(OBJ, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, s.content);
    uploads.push(key);
  }

  if (s.filePath) {
    const src = path.join(DATA, "uploads", s.filePath);
    if (fs.existsSync(src)) {
      const key = `uploads/${s.filePath}`;
      const dest = path.join(OBJ, key);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      uploads.push(key);
    } else {
      console.warn(`missing upload file: ${s.filePath}`);
    }
  }
}

fs.writeFileSync(path.join(OUT, "data.sql"), sql.join("\n") + "\n");

const lines = ["#!/bin/bash", "set -e", 'cd "$(dirname "$0")"'];
for (const key of uploads) {
  lines.push(
    `npx wrangler r2 object put 'vershare-files/${key}' --file 'r2-objects/${key}' --remote`
  );
}
fs.writeFileSync(path.join(OUT, "r2-upload.sh"), lines.join("\n") + "\n", {
  mode: 0o755,
});

console.log(
  `wrote ${sql.length} SQL rows, staged ${uploads.length} R2 objects`
);
