import { describe, expect, it } from 'vitest';
import { devicesText, officePort, permissionText, pushBlocker } from './notifications';

describe('the notification settings', () => {
  it('count the devices that get push', () => {
    expect(devicesText(0)).toBe('No devices get push yet');
    expect(devicesText(1)).toBe('1 device gets push');
    expect(devicesText(3)).toBe('3 devices get push');
  });

  it("put the office's own port in the Tailscale line", () => {
    expect(officePort({ hostname: 'localhost', port: '5653' })).toBe('5653');
    expect(officePort({ hostname: '127.0.0.1', port: '4600' })).toBe('4600');
    expect(officePort({ hostname: 'office-pc.tailnet.ts.net', port: '' })).toBe('4517');
  });

  it('say whether this browser shows notes, and why push is off', () => {
    expect(permissionText('default')).toBeNull();
    expect(permissionText('denied')?.tone).toBe('bad');
    expect(pushBlocker('ok')).toBeNull();
    expect(pushBlocker('insecure')).toMatch(/HTTPS/);
    expect(pushBlocker('unsupported')).toMatch(/iPhone/);
  });
});
