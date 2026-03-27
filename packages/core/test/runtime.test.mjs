import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { isMainModule } from '../src/runtime.mjs';

test('isMainModule matches platform-native absolute script paths', () => {
  const scriptPath = path.resolve(process.cwd(), '..', '..', 'tools', 'generate-docs.mjs');
  const importMetaUrl = pathToFileURL(scriptPath).href;

  assert.equal(isMainModule(importMetaUrl, scriptPath), true);
});

test(
  'isMainModule matches POSIX script paths on POSIX platforms',
  { skip: process.platform === 'win32' },
  () => {
    assert.equal(
      isMainModule(
        'file:///home/calvin/LabFlow/tools/generate-docs.mjs',
        '/home/calvin/LabFlow/tools/generate-docs.mjs'
      ),
      true
    );
  }
);

test(
  'isMainModule matches Windows drive-letter paths on Windows',
  { skip: process.platform !== 'win32' },
  () => {
    assert.equal(
      isMainModule(
        'file:///C:/Users/calvin/LabFlow/tools/generate-docs.mjs',
        'C:\\Users\\calvin\\LabFlow\\tools\\generate-docs.mjs'
      ),
      true
    );
  }
);

test('isMainModule returns false for different files', () => {
  assert.equal(
    isMainModule(
      'file:///home/calvin/LabFlow/tools/generate-docs.mjs',
      '/home/calvin/LabFlow/tools/other.mjs'
    ),
    false
  );
});

test('isMainModule returns false when argv1 is missing', () => {
  assert.equal(
    isMainModule('file:///home/calvin/LabFlow/tools/generate-docs.mjs', undefined),
    false
  );
});
