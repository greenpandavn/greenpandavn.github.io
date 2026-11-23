import { describe, expect, it } from 'vitest';
import { compareVersions, pickAnnouncement, cleanAnnouncement, announcementId, DEFAULT_ANNOUNCEMENT } from './announcement';
import { needsLogin } from './gate';
import { resolveLogin } from './merge';
import { defaultProgress } from './store';
import { APP_VERSION } from './version';

describe('v5.2.8 announcement', () => {
  it('bundled notice names the current version', () => {
    expect(DEFAULT_ANNOUNCEMENT.version).toBe(APP_VERSION);
    expect(DEFAULT_ANNOUNCEMENT.title).toContain(APP_VERSION);
  });
  it('compares dotted versions', () => {
    expect(compareVersions('5.2.10', '5.2.9')).toBeGreaterThan(0);
    expect(compareVersions('5.2.8', '5.2.8')).toBe(0);
    expect(compareVersions('5.2', '5.2.8')).toBeLessThan(0);
  });
  it('admin notice wins unless it is older than the build', () => {
    const b = { version: '5.2.8', title: 'b', body: 'b', updatedAt: 0 };
    expect(pickAnnouncement(null, b)).toBe(b);
    expect(pickAnnouncement({ ...b, version: '5.2.7', title: 'old' }, b)).toBe(b);
    expect(pickAnnouncement({ ...b, title: 'same', updatedAt: 5 }, b).title).toBe('same');
    expect(pickAnnouncement({ ...b, version: '5.3', title: 'new' }, b).title).toBe('new');
  });
  it('a changed text or version is a new notice', () => {
    const a = { version: '5.2.8', title: 't', body: 'b', updatedAt: 1 };
    expect(announcementId(a)).not.toBe(announcementId({ ...a, updatedAt: 2 }));
    expect(announcementId(a)).not.toBe(announcementId({ ...a, version: '5.2.9' }));
  });
  it('rejects broken documents and trims fields', () => {
    expect(cleanAnnouncement(null)).toBeNull();
    expect(cleanAnnouncement({ title: '', body: 'x' })).toBeNull();
    expect(cleanAnnouncement({ title: ' T ', body: 'x', version: 'v5.2.9', updatedAt: 3 })).toEqual({ title: 'T', body: 'x', version: '5.2.9', updatedAt: 3 });
  });
});

describe('v5.2.8 login gate', () => {
  it('only Parts 1–2 are open without an account', () => {
    expect([1, 2].map(needsLogin)).toEqual([false, false]);
    expect([3, 4, 5, 101, 201].every(needsLogin)).toBe(true);
    expect(needsLogin(undefined)).toBe(false);
  });
});

describe('v5.2.8 anonymous XP merged into an account', () => {
  const p = (xp: number, en?: number) => {
    const d = defaultProgress();
    return { ...d, xp, ...(en === undefined ? {} : { en: { ...d.en!, xp: en } }) };
  };
  it('adds anonymous XP to an existing account', () => {
    const r = resolveLogin({ cloud: p(500), cache: null, guest: p(120), alreadyMigrated: false, fallback: p(0) });
    expect(r.migrated).toBe(true);
    expect(r.progress.xp).toBe(620);
  });
  it('a new (linked) account simply takes the anonymous progress', () => {
    expect(resolveLogin({ cloud: null, cache: null, guest: p(120), alreadyMigrated: false, fallback: p(0) }).progress.xp).toBe(120);
  });
  it('does not add twice: already migrated uid, or XP already carried', () => {
    expect(resolveLogin({ cloud: p(620), cache: null, guest: p(120), alreadyMigrated: true, fallback: p(0) }).progress.xp).toBe(620);
    expect(resolveLogin({ cloud: p(300), cache: null, guest: p(150), alreadyMigrated: false, fallback: p(0), carried: { zh: 120, en: 0 } }).progress.xp).toBe(330);
  });
});
