// Patches console.* so sensitive fields (passwords, tokens, OTPs) never reach
// stdout/stderr — regardless of whether the call came from Nest's Logger,
// a raw console.log, or a third-party SDK. This matters because log output
// commonly ends up in Docker logs / CloudWatch / log aggregators, which are
// a much wider blast radius than the app itself.

const SENSITIVE_KEYS = [
  'password',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'resettoken',
  'otp',
  'otpcode',
  'code',
  'authorization',
];

const REDACTED = '[REDACTED]';

// Matches JWT-shaped strings: header.payload.signature (base64url segments)
const JWT_PATTERN =
  /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key.toLowerCase());
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      output[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(val, seen);
    }
    return output;
  }

  if (typeof value === 'string') {
    return value.replace(JWT_PATTERN, REDACTED);
  }

  return value;
}

function sanitizeArg(arg: unknown): unknown {
  if (typeof arg === 'string') {
    return arg.replace(JWT_PATTERN, REDACTED);
  }
  if (isPlainObject(arg) || Array.isArray(arg)) {
    return sanitizeValue(arg);
  }
  return arg;
}

let patched = false;

export function patchConsoleForSensitiveData(): void {
  if (patched) return;
  patched = true;

  (['log', 'error', 'warn', 'debug', 'info'] as const).forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args.map(sanitizeArg));
    };
  });
}
