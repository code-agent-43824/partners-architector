import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GUIDED_REPLAY_EVENT,
  guidedScreenFor,
  markSeen,
  replayGuidedScreen,
  wasSeen,
} from './guidedContent';

function storageStub() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('guided content', () => {
  it('maps all guided partnership routes to their own screen', () => {
    expect(guidedScreenFor('/partnerships/case-1')?.kind).toBe('partnership');
    expect(guidedScreenFor('/partnerships/case-1/partners')?.kind).toBe('partners');
    expect(guidedScreenFor('/partnerships/case-1/sessions')?.kind).toBe('sessions');
  });

  it('replays only the requested screen and notifies the overlay', () => {
    const sessionStorage = storageStub();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('window', { dispatchEvent });

    markSeen('partnership');
    markSeen('partners');
    replayGuidedScreen('partnership');

    expect(wasSeen('partnership')).toBe(false);
    expect(wasSeen('partners')).toBe(true);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    expect((dispatchEvent.mock.calls[0]?.[0] as Event).type).toBe(GUIDED_REPLAY_EVENT);
  });
});
