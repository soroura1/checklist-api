/**
 * Configuration, validated at startup.
 *
 * A service with invalid configuration FAILS TO START rather than starting wrong. Starting wrong is
 * worse than not starting: it looks healthy, serves requests, and is misconfigured in a way nobody
 * notices until it matters.
 */

const REQUIRED = [
  ['DB_HOST', 'dbHost'],
  ['DB_NAME', 'dbName'],
  ['APP_DB_USER', 'appDbUser'],
  ['APP_DB_PASSWORD', 'appDbPassword'],
];

const OPTIONAL = [
  ['DB_PORT', 'dbPort', 5432, Number],
  ['PORT', 'port', 8081, Number],
  ['HOST', 'host', '0.0.0.0', String],
  ['DB_POOL_MAX', 'dbPoolMax', 10, Number],
  ['OWNER_DB_USER', 'ownerDbUser', null, String],
  ['OWNER_DB_PASSWORD', 'ownerDbPassword', null, String],
  ['COMMIT_SHA', 'commitSha', 'unknown', String],
  ['RATE_LIMIT_MAX', 'rateLimitMax', 120, Number],
  ['RATE_LIMIT_WINDOW', 'rateLimitWindow', '1 minute', String],
];

export function loadConfig(env = process.env) {
  const missing = [];
  const config = {};

  for (const [name, key] of REQUIRED) {
    if (!env[name]) missing.push(name);
    else config[key] = env[name];
  }

  if (missing.length) {
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}.\n` +
        'The service will not start with invalid configuration — starting wrong is worse than not starting.',
    );
  }

  for (const [name, key, fallback, cast] of OPTIONAL) {
    config[key] = env[name] !== undefined ? cast(env[name]) : fallback;
  }

  // The commit SHA is what makes deployment externally verifiable. Warn loudly when it is
  // unset — an /version endpoint reporting "unknown" cannot answer the question it exists for.
  if (config.commitSha === 'unknown') {
    console.warn(
      '[config] COMMIT_SHA is unset. /version cannot verify what is deployed. ' +
        'Set it in the build.',
    );
  }

  return Object.freeze(config);
}
