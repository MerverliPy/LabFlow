import test from 'node:test';
import assert from 'node:assert/strict';

import { isMainModule } from '../src/runtime.mjs';

test('isMainModule matches POSIX script paths', () => {
  assert.equal(
    isMainModule(
      'file:///home/calvin/LabFlow/tools/generate-docs.mjs',
      '/home/calvin/LabFlow/tools/generate-docs.mjs'
    ),
    true
  );
});

test('isMainModule matches Windows drive-letter paths', () => {
  assert.equal(
    isMainModule(
      'file:///C:/Users/calvin/LabFlow/tools/generate-docs.mjs',
      'C:\\Users\\calvin\\LabFlow\\tools\\generate-docs.mjs'
    ),
    true
  );
});

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
