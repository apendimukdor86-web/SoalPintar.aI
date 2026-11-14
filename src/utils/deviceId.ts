const DEVICE_ID_STORAGE_KEY = 'soalpintar_device_id';
const COMPLETED_LOCKS_STORAGE_KEY = 'soalpintar_exam_device_locks';

export interface ExamDeviceLock {
  token: string;
  googleFormUrl?: string;
  deviceId: string;
  nisn: string;
  studentName: string;
  completedAt: number;
}

function collectBrowserFingerprintSource(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'soalpintar-ssr-device';
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const scr = window.screen;

  let canvasSig = '';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#10b981';
      ctx.fillText('soalpintar-device-fp', 2, 2);
      canvasSig = canvas.toDataURL().slice(-48);
    }
  } catch {
    canvasSig = 'no-canvas';
  }

  let tz = 'UTC';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    tz = 'UTC';
  }

  return [
    nav.userAgent || '',
    nav.platform || '',
    nav.language || '',
    String(nav.hardwareConcurrency || 0),
    String(nav.deviceMemory || 0),
    String(nav.maxTouchPoints || 0),
    `${scr?.width || 0}x${scr?.height || 0}x${scr?.colorDepth || 0}`,
    tz,
    canvasSig,
  ].join('|');
}

/**
 * Deterministic 32-character hex digest (synchronous fallback / immediate ID)
 */
function computeSync32Hex(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let h3 = 0x9e3779b9 ^ input.length;
  let h4 = 0x85ebca6b ^ input.length;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ (ch << 3), 2246822519);
    h4 = Math.imul(h4 ^ (ch << 5), 3266489917);
  }

  const mix = (n: number) => {
    let x = n >>> 0;
    x = Math.imul(x ^ (x >>> 16), 2246822507);
    x = Math.imul(x ^ (x >>> 13), 3266489909);
    return (x ^ (x >>> 16)) >>> 0;
  };

  return (
    mix(h1 ^ h2).toString(16).padStart(8, '0') +
    mix(h2 ^ h3).toString(16).padStart(8, '0') +
    mix(h3 ^ h4).toString(16).padStart(8, '0') +
    mix(h4 ^ h1).toString(16).padStart(8, '0')
  );
}

/**
 * Returns the persistent 32-char hex Device ID synchronously (reading from localStorage
 * or computing from device/browser hardware fingerprint).
 */
export function getSyncDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored && /^[a-f0-9]{32}$/i.test(stored)) {
      return stored.toLowerCase();
    }
  } catch {
    // Ignore storage error
  }

  const fallbackId = computeSync32Hex(collectBrowserFingerprintSource());
  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, fallbackId);
  } catch {
    // Ignore storage error
  }
  return fallbackId;
}

/**
 * Computes SHA-256 32-char hex Device ID asynchronously and persists it so both
 * desktop computers and mobile phones receive a consistent hardware/browser Device ID.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored && /^[a-f0-9]{32}$/i.test(stored)) {
      return stored.toLowerCase();
    }
  } catch {
    // Ignore storage error
  }

  const source = collectBrowserFingerprintSource();
  let hexId = '';

  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(source);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hexId = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    }
  } catch {
    // Fallback below
  }

  if (!hexId) {
    hexId = computeSync32Hex(source);
  }

  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, hexId);
  } catch {
    // Ignore storage error
  }

  return hexId;
}

export function detectDeviceCategory(): 'HP / Tablet' | 'Komputer / Laptop' {
  if (typeof navigator === 'undefined') return 'Komputer / Laptop';
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUa = /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
  const hasTouch = (navigator.maxTouchPoints || 0) > 1 && window.innerWidth <= 1024;
  return isMobileUa || hasTouch ? 'HP / Tablet' : 'Komputer / Laptop';
}

export function normalizeExamLinkKey(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const u = new URL(rawUrl.trim());
    // Normalize Google Form URL to base pathname so ?embedded=true vs viewform matches
    return `${u.hostname}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export function getLocalExamLocks(): ExamDeviceLock[] {
  try {
    const raw = localStorage.getItem(COMPLETED_LOCKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        token: String(item.token || '').trim().toUpperCase(),
        googleFormUrl: typeof item.googleFormUrl === 'string' ? item.googleFormUrl : '',
        deviceId: String(item.deviceId || '').trim(),
        nisn: String(item.nisn || '').trim(),
        studentName: String(item.studentName || 'Siswa CBT').trim(),
        completedAt: Number(item.completedAt) || 0,
      }))
      .filter((item) => Boolean(item.token || item.googleFormUrl));
  } catch {
    return [];
  }
}

export function saveLocalExamLock(lock: ExamDeviceLock): void {
  try {
    const existing = getLocalExamLocks();
    const normToken = String(lock.token || '').trim().toUpperCase();
    const normForm = normalizeExamLinkKey(lock.googleFormUrl);
    const normNisn = String(lock.nisn || '').trim().toLowerCase();
    const filtered = existing.filter((item) => {
      const sameToken = item.token.toUpperCase() === normToken;
      const sameDevice = item.deviceId === lock.deviceId;
      const sameNisn = Boolean(normNisn && normNisn !== '-' && item.nisn.trim().toLowerCase() === normNisn);
      return !(sameToken && (sameDevice || sameNisn));
    });
    filtered.unshift({
      ...lock,
      token: normToken,
      deviceId: String(lock.deviceId || '').trim(),
      nisn: String(lock.nisn || '').trim(),
      studentName: String(lock.studentName || 'Siswa CBT').trim(),
      googleFormUrl: normForm || lock.googleFormUrl,
    });
    localStorage.setItem(COMPLETED_LOCKS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore storage error
  }
}

export function findLocalExamLock(params: {
  token?: string;
  googleFormUrl?: string;
  deviceId: string;
  nisn?: string;
}): ExamDeviceLock | null {
  const locks = getLocalExamLocks();
  const normToken = String(params.token || '').trim().toUpperCase();
  const normForm = normalizeExamLinkKey(params.googleFormUrl);
  const normNisn = String(params.nisn || '').trim().toLowerCase();

  for (const item of locks) {
    const sameToken = Boolean(normToken && item.token.toUpperCase() === normToken);
    const itemForm = normalizeExamLinkKey(item.googleFormUrl);
    const sameForm = Boolean(normForm && itemForm && itemForm === normForm);

    if (!sameToken && !sameForm) continue;

    const sameDevice = Boolean(params.deviceId && item.deviceId === params.deviceId);
    const sameNisn = Boolean(normNisn && normNisn !== '-' && item.nisn.trim().toLowerCase() === normNisn);

    if (sameDevice || sameNisn) {
      return item;
    }
  }
  return null;
}

export function clearLocalExamLock(params: {
  token?: string;
  googleFormUrl?: string;
  deviceId?: string;
}): void {
  try {
    const locks = getLocalExamLocks();
    const normToken = String(params.token || '').trim().toUpperCase();
    const normForm = normalizeExamLinkKey(params.googleFormUrl);

    const remaining = locks.filter((item) => {
      const sameToken = Boolean(normToken && item.token.toUpperCase() === normToken);
      const itemForm = normalizeExamLinkKey(item.googleFormUrl);
      const sameForm = Boolean(normForm && itemForm && itemForm === normForm);
      if (!sameToken && !sameForm) return true;
      if (params.deviceId && item.deviceId !== params.deviceId) return true;
      return false;
    });
    localStorage.setItem(COMPLETED_LOCKS_STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // Ignore storage error
  }
}
