import path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizeMainPath(filePath, cwd = process.cwd()) {
  if (!filePath) return null;

  let normalized = filePath;
  const isWindowsDrivePath = /^[A-Za-z]:[\\/]/.test(normalized);
  const isRootedAbsolutePath = /^[\\/]/.test(normalized);

  if (!isWindowsDrivePath && !isRootedAbsolutePath) {
    normalized = path.resolve(cwd, normalized);
  }

  normalized = normalized
    .replace(/\\/g, '/')
    .replace(/^\/([A-Za-z]:\/)/, '$1')
    .replace(/\/+/g, '/');

  if (/^[A-Za-z]:\//.test(normalized)) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

export function isMainModule(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;

  try {
    return normalizeMainPath(fileURLToPath(importMetaUrl)) === normalizeMainPath(argv1);
  } catch {
    return false;
  }
}
