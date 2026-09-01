/**
 * The Activity screen's arithmetic.
 *
 * These are the only numbers in the dashboard that are computed rather than
 * read from the API, so they are the only ones that can be wrong on their own.
 */

import {describe, expect, it} from 'vitest';

import {
  bucketByDay,
  deliveryRate,
  mostAlerted,
  targetNames,
} from '@/services/alert.service';
import type {AlertLog, Device} from '@/types/models';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed "now" so the day buckets do not shift with the wall clock. */
const NOW = new Date('2026-09-01T15:00:00Z').getTime();

function alert(overrides: Partial<AlertLog> = {}): AlertLog {
  return {
    alert_id: crypto.randomUUID(),
    target_devices: ['device-a'],
    status: 'SENT',
    created_at: new Date(NOW).toISOString(),
    ...overrides,
  };
}

function device(overrides: Partial<Device> = {}): Device {
  return {
    device_id: 'device-a',
    device_name: 'iPhone 15 Pro',
    device_type: 'ios',
    device_os_version: '17.2',
    battery_level: 85,
    status: 'ONLINE',
    last_heartbeat: new Date(NOW).toISOString(),
    created_at: new Date(NOW).toISOString(),
    is_guest: false,
    ...overrides,
  };
}

describe('bucketByDay', () => {
  it('keeps quiet days as zero columns', () => {
    // A chart that dropped empty days would compress the axis and make a
    // quiet week look like a busy one.
    const days = bucketByDay([alert()], 7, NOW);

    expect(days).toHaveLength(7);
    expect(days.filter(day => day.count === 0)).toHaveLength(6);
    expect(days[6]?.count).toBe(1);
  });

  it('drops alerts older than the window rather than piling them onto day one', () => {
    const old = alert({created_at: new Date(NOW - 30 * DAY_MS).toISOString()});
    const days = bucketByDay([old], 7, NOW);

    expect(days.reduce((total, day) => total + day.count, 0)).toBe(0);
  });

  it('runs oldest column first', () => {
    const days = bucketByDay([], 7, NOW);
    const times = days.map(day => day.date.getTime());

    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('deliveryRate', () => {
  it('is null for an empty sample, not zero', () => {
    // "0%" reads as total failure, which is a different claim from
    // "nothing has been sent".
    expect(deliveryRate([])).toBeNull();
  });

  it('counts everything that is not FAILED as delivered', () => {
    const alerts = [
      alert({status: 'SENT'}),
      alert({status: 'RECEIVED'}),
      alert({status: 'FAILED'}),
      alert({status: 'SENT'}),
    ];

    expect(deliveryRate(alerts)).toBe(75);
  });
});

describe('mostAlerted', () => {
  it('names the device targeted most often', () => {
    const alerts = [
      alert({target_devices: ['device-a']}),
      alert({target_devices: ['device-a', 'device-b']}),
      alert({target_devices: ['device-b']}),
      alert({target_devices: ['device-b']}),
    ];

    expect(mostAlerted(alerts, [device({device_id: 'device-b', device_name: 'Pixel 8'})])).toEqual(
      {name: 'Pixel 8', count: 3},
    );
  });

  it('is null when nothing has been alerted', () => {
    expect(mostAlerted([], [device()])).toBeNull();
  });
});

describe('targetNames', () => {
  it('keeps a removed device in the row instead of dropping it', () => {
    // The alert log is an audit record. A target that has since been deleted
    // must still appear, or the history quietly loses entries.
    const names = targetNames(alert({target_devices: ['device-a', 'gone-1234-5678']}), [device()]);

    expect(names[0]).toBe('iPhone 15 Pro');
    expect(names[1]).toContain('Removed device');
  });
});
