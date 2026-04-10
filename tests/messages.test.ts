import { describe, it, expect } from 'vitest';
import { isExportRequest, isNodeMetadata, isExportResult } from '@common/types';

describe('isExportRequest', () => {
  const valid = { type: 'export-request', payload: { referenceColor: '#FFFFFF', scale: 2 } };
  it('accepts valid request', () => expect(isExportRequest(valid)).toBe(true));
  it('rejects missing type', () => expect(isExportRequest({ payload: { referenceColor: '#FFFFFF', scale: 2 } })).toBe(false));
  it('rejects wrong type value', () => expect(isExportRequest({ type: 'wrong', payload: { referenceColor: '#FFFFFF', scale: 2 } })).toBe(false));
  it('rejects scale=0', () => expect(isExportRequest({ type: 'export-request', payload: { referenceColor: '#FFFFFF', scale: 0 } })).toBe(false));
  it('rejects negative scale', () => expect(isExportRequest({ type: 'export-request', payload: { referenceColor: '#FFFFFF', scale: -1 } })).toBe(false));
  it('rejects invalid color', () => expect(isExportRequest({ type: 'export-request', payload: { referenceColor: 'nope', scale: 2 } })).toBe(false));
  it('rejects null', () => expect(isExportRequest(null)).toBe(false));
  it('rejects undefined', () => expect(isExportRequest(undefined)).toBe(false));
});

describe('isNodeMetadata', () => {
  const valid = {
    type: 'node-metadata',
    payload: { name: 'Frame 1', width: 100, height: 200, blendMode: 'NORMAL', effectiveModes: [], opacity: 1, nodeType: 'FRAME' },
  };
  it('accepts valid metadata', () => expect(isNodeMetadata(valid)).toBe(true));
  it('rejects null', () => expect(isNodeMetadata(null)).toBe(false));
});

describe('isExportResult', () => {
  const valid = {
    type: 'export-result',
    payload: { composited: [1, 2], alphaSource: [3, 4], width: 100, height: 100 },
  };
  it('accepts valid result', () => expect(isExportResult(valid)).toBe(true));
  it('rejects null', () => expect(isExportResult(null)).toBe(false));
});
