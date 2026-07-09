#!/usr/bin/env node
/* global URL, console, fetch, process */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = new URL('../..', import.meta.url).pathname;
const POSTGRES_USER = 'psa';
const POSTGRES_DB = 'psa';
const POSTGRES_PASSWORD = `psa_e2e_${randomBytes(8).toString('hex')}`;
const AUTH_REGISTRATION_CODE = `e2e-${randomBytes(8).toString('hex')}`;
const AUTH_JWT_SECRET = `psa-e2e-secret-${randomBytes(24).toString('hex')}`;
const AUTH_ADMIN_EMAIL = `admin-${Date.now()}@example.test`;
const AUTH_ADMIN_PASSWORD = `AdminPassword123-${randomBytes(4).toString('hex')}`;
const DEMO_ARCHITECT_EMAIL = `demo-${Date.now()}@example.test`;
const DEMO_ARCHITECT_PASSWORD = `DemoPassword123-${randomBytes(4).toString('hex')}`;
const PROJECT = `psa-e2e-${process.pid}`;

function log(message) {
  console.log(`[e2e] ${message}`);
}

function commandText(command, args) {
  return [command, ...args].join(' ');
}

function run(command, args, options = {}) {
  const env = { ...process.env, ...options.env };
  log(`$ ${commandText(command, args)}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${commandText(command, args)} failed with exit code ${code}\n${stdout}${stderr}`,
        ),
      );
    });
  });
}

async function runExpectFailure(command, args, options = {}) {
  try {
    await run(command, args, options);
  } catch {
    return;
  }
  throw new Error(`${commandText(command, args)} was expected to fail`);
}

async function hasCommand(command, args = ['--version']) {
  try {
    await run(command, args, { capture: true });
    return true;
  } catch {
    return false;
  }
}

async function databaseDriver(dbPort) {
  if (await hasCommand('docker', ['compose', 'version'])) {
    return composeDriver('docker', ['compose']);
  }
  if (await hasCommand('podman', ['compose', 'version'])) {
    return composeDriver('podman', ['compose']);
  }
  if (await hasCommand('podman', ['--version'])) {
    return podmanDriver(dbPort);
  }
  throw new Error('Docker Compose, Podman Compose, or Podman is required for pnpm test:e2e');
}

function composeArgs(composeBase, extra) {
  return [...composeBase, '--project-name', PROJECT, '-f', 'deploy/docker-compose.yml', ...extra];
}

function composeDriver(command, composeBase) {
  const env = {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    AUTH_JWT_SECRET,
    AUTH_COOKIE_SECURE: 'false',
  };
  return {
    name: commandText(command, composeBase),
    async up(dbPort) {
      await run(command, composeArgs(composeBase, ['up', '-d', 'db']), {
        env: { ...env, DB_PORT: String(dbPort) },
      });
    },
    wait(dbPort) {
      return waitFor(
        () =>
          run(
            command,
            composeArgs(composeBase, [
              'exec',
              '-T',
              'db',
              'pg_isready',
              '-U',
              POSTGRES_USER,
              '-d',
              POSTGRES_DB,
            ]),
            {
              capture: true,
              env: { ...env, DB_PORT: String(dbPort) },
            },
          ).then(() => true),
        'database readiness',
      );
    },
    down(dbPort) {
      return run(command, composeArgs(composeBase, ['down', '-v', '--remove-orphans']), {
        env: { ...env, DB_PORT: String(dbPort) },
      });
    },
  };
}

function podmanDriver(dbPort) {
  const name = `${PROJECT}-db`;
  return {
    name: 'podman',
    async up() {
      await run('podman', [
        'run',
        '-d',
        '--name',
        name,
        '-e',
        `POSTGRES_USER=${POSTGRES_USER}`,
        '-e',
        `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
        '-e',
        `POSTGRES_DB=${POSTGRES_DB}`,
        '-p',
        `127.0.0.1:${dbPort}:5432`,
        '-v',
        `${ROOT}/deploy/db/init:/docker-entrypoint-initdb.d:ro`,
        'docker.io/pgvector/pgvector:pg16',
      ]);
    },
    wait() {
      return waitFor(
        () =>
          run('podman', ['exec', name, 'pg_isready', '-U', POSTGRES_USER, '-d', POSTGRES_DB], {
            capture: true,
          }).then(() => true),
        'database readiness',
      );
    },
    down() {
      return run('podman', ['rm', '-f', '-v', name]);
    },
  };
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitFor(condition, label, timeoutMs = 60_000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await condition();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(1000);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

class CookieJar {
  #cookies = new Map();

  addFrom(response) {
    const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
    const headers =
      typeof getSetCookie === 'function'
        ? getSetCookie()
        : splitSetCookieHeader(response.headers.get('set-cookie'));
    for (const header of headers) {
      const pair = header.split(';', 1)[0];
      const index = pair.indexOf('=');
      if (index > 0) {
        this.#cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    }
  }

  header() {
    return [...this.#cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  csrf() {
    return this.#cookies.get('psa_csrf');
  }
}

function splitSetCookieHeader(value) {
  if (!value) {
    return [];
  }
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g);
}

function apiClient(baseUrl, jar = new CookieJar()) {
  return {
    jar,
    async request(method, path, body, expected) {
      const headers = { accept: 'application/json' };
      const cookie = jar.header();
      if (cookie) {
        headers.cookie = cookie;
      }
      if (body !== undefined) {
        headers['content-type'] = 'application/json';
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrf = jar.csrf();
        if (csrf) {
          headers['x-csrf-token'] = csrf;
        }
      }
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      jar.addFrom(response);
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      if (expected !== undefined) {
        assert.equal(
          response.status,
          expected,
          `${method} ${path} expected ${expected}, got ${response.status}: ${JSON.stringify(payload)}`,
        );
      }
      return { response, payload };
    },
    get(path, expected = 200) {
      return this.request('GET', path, undefined, expected);
    },
    post(path, body, expected = 200) {
      return this.request('POST', path, body, expected);
    },
    patch(path, body, expected = 200) {
      return this.request('PATCH', path, body, expected);
    },
    put(path, body, expected = 200) {
      return this.request('PUT', path, body, expected);
    },
    delete(path, expected = 204) {
      return this.request('DELETE', path, undefined, expected);
    },
  };
}

async function runApiAssertions(baseUrl) {
  const unauth = apiClient(baseUrl);
  await unauth.get('/health');
  await unauth.get('/health/db');
  await unauth.get('/partnerships', 401);

  await unauth.post(
    '/auth/register',
    { email: 'missing-code@example.test', password: 'Password123!', displayName: 'No Code' },
    403,
  );

  const userA = apiClient(baseUrl);
  const emailA = `w4-a-${Date.now()}@example.test`;
  await userA.post(
    '/auth/register',
    {
      email: emailA,
      password: 'Password123!',
      displayName: 'Architect A',
      registrationCode: AUTH_REGISTRATION_CODE,
    },
    201,
  );
  await userA.post('/auth/login', { email: emailA, password: 'Password123!' });
  const me = await userA.get('/auth/me');
  assert.equal(me.payload.email, emailA);

  await userA.post(
    '/auth/change-password',
    { currentPassword: 'Password123!', newPassword: 'NewPassword123!' },
    204,
  );
  const oldPasswordClient = apiClient(baseUrl);
  await oldPasswordClient.post('/auth/login', { email: emailA, password: 'Password123!' }, 401);
  const newPasswordClient = apiClient(baseUrl);
  await newPasswordClient.post('/auth/login', { email: emailA, password: 'NewPassword123!' });

  const admin = apiClient(baseUrl);
  await admin.post('/auth/login', { email: AUTH_ADMIN_EMAIL, password: AUTH_ADMIN_PASSWORD });
  const accounts = await admin.get('/accounts');
  const userAAccount = accounts.payload.find((account) => account.email === emailA);
  assert.ok(userAAccount?.id);
  await admin.patch(`/accounts/${userAAccount.id}/password`, { password: 'ResetPassword123!' });
  const resetPasswordClient = apiClient(baseUrl);
  await resetPasswordClient.post('/auth/login', {
    email: emailA,
    password: 'ResetPassword123!',
  });
  log('waiting for auth throttle window before continuing login-heavy e2e checks');
  await delay(61_000);

  const csrfResponse = await fetch(`${baseUrl}/partnerships`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userA.jar.header() },
    body: JSON.stringify({ name: 'CSRF should fail' }),
  });
  assert.equal(csrfResponse.status, 403);

  const created = await userA.post(
    '/partnerships',
    {
      name: 'W4 smoke partnership',
      notes: 'Created by committed e2e suite',
    },
    201,
  );
  const partnershipId = created.payload.id;

  const tooSmallPartnership = await userA.post(
    '/partnerships',
    { name: 'W4 start guard partnership' },
    201,
  );
  const tooSmallSession = await userA.post(
    `/partnerships/${tooSmallPartnership.payload.id}/sessions`,
    { kind: 'initial', title: 'Too small' },
    201,
  );
  await userA.post(
    `/partnerships/${tooSmallPartnership.payload.id}/sessions/${tooSmallSession.payload.id}/start`,
    undefined,
    409,
  );

  const userB = apiClient(baseUrl);
  const emailB = `w4-b-${Date.now()}@example.test`;
  await userB.post(
    '/auth/register',
    {
      email: emailB,
      password: 'Password123!',
      displayName: 'Architect B',
      registrationCode: AUTH_REGISTRATION_CODE,
    },
    201,
  );
  await userB.post('/auth/login', { email: emailB, password: 'Password123!' });
  await userB.get(`/partnerships/${partnershipId}`, 403);

  const partners = [];
  for (const fullName of [
    'Анна Доля',
    'Борис Вклад',
    'Вера Операции',
    'Глеб Продажи',
    'Дарья Финансы',
  ]) {
    const partner = await userA.post(
      `/partnerships/${partnershipId}/partners`,
      { fullName, role: 'Партнёр' },
      201,
    );
    partners.push(partner.payload);
  }
  await userA.post(`/partnerships/${partnershipId}/partners`, { fullName: 'Шестой партнёр' }, 409);

  const reversedIds = partners.map((partner) => partner.id).reverse();
  const reordered = await userA.post(`/partnerships/${partnershipId}/partners/reorder`, {
    ids: reversedIds,
  });
  assert.deepEqual(
    reordered.payload.map((partner) => partner.id),
    reversedIds,
  );

  const session = await userA.post(
    `/partnerships/${partnershipId}/sessions`,
    { kind: 'initial', title: 'W4 e2e initial session' },
    201,
  );
  const sessionId = session.payload.id;
  const started = await userA.post(`/partnerships/${partnershipId}/sessions/${sessionId}/start`);
  assert.equal(started.payload.status, 'in_progress');

  const clauses = await userA.get(`/partnerships/${partnershipId}/sessions/${sessionId}/clauses`);
  assert.equal(clauses.payload.length, 30);
  const clause1 = clauses.payload[0];
  const clause2 = clauses.payload[1];
  const sharesClause = clauses.payload.find((clause) => clause.question.number === 5);
  const meaningClause = clauses.payload.find((clause) => clause.question.number === 6);
  assert.ok(clause1?.id);
  assert.ok(clause2?.id);
  assert.ok(sharesClause?.id);
  assert.ok(meaningClause?.id);

  await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause1.id}`,
    { status: 'agreed' },
    409,
  );
  const updatedClause = await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause1.id}`,
    {
      text: '<p><strong>Стороны согласовали общий принцип.</strong></p><script>bad()</script>',
      rationale: 'Зафиксировано на W4 e2e.',
      status: 'agreed',
    },
  );
  assert.equal(updatedClause.payload.status, 'agreed');
  assert.equal(
    updatedClause.payload.text,
    '<p><strong>Стороны согласовали общий принцип.</strong></p>',
  );

  await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause2.id}`,
    { status: 'not_applicable' },
    400,
  );
  const notApplicable = await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause2.id}`,
    { status: 'not_applicable', naReason: 'Не относится к демо-кейсу.' },
  );
  assert.equal(notApplicable.payload.status, 'not_applicable');
  assert.equal(notApplicable.payload.naReason, 'Не относится к демо-кейсу.');
  const leftNotApplicable = await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause2.id}`,
    { status: 'in_progress', text: '<p>Вернули блок в работу.</p>' },
  );
  assert.equal(leftNotApplicable.payload.naReason, null);

  const signoff = await userA.put(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause1.id}/signoffs/${partners[0].id}`,
    { agreed: true },
  );
  assert.equal(signoff.payload.agreed, true);
  assert.ok(signoff.payload.signedAt);

  const savedVersion = await userA.post(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause1.id}/versions`,
    { note: 'W4 explicit snapshot' },
    201,
  );
  const versions = await userA.get(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause1.id}/versions`,
  );
  assert.ok(versions.payload.some((version) => version.id === savedVersion.payload.id));

  await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${sharesClause.id}`,
    {
      structuredData: {
        shares: {
          mode: 'manual',
          allocations: [
            { partnerId: partners[0].id, percent: 40 },
            { partnerId: partners[1].id, percent: 30 },
            { partnerId: partners[2].id, percent: 30 },
          ],
        },
      },
    },
  );
  await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${sharesClause.id}`,
    {
      structuredData: {
        shares: {
          mode: 'manual',
          allocations: [{ partnerId: partners[0].id, percent: 120 }],
        },
      },
    },
    400,
  );
  await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${sharesClause.id}`,
    { structuredData: { extra: true } },
    400,
  );
  await userA.patch(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${meaningClause.id}`,
    {
      structuredData: {
        meaning: { voting: true, profit: true, ownership: true, losses: false },
      },
    },
  );

  const restored = await userA.post(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clause1.id}/versions/${savedVersion.payload.id}/restore`,
  );
  assert.equal(restored.payload.text, '<p><strong>Стороны согласовали общий принцип.</strong></p>');

  const agreement = await userA.get(
    `/partnerships/${partnershipId}/sessions/${sessionId}/agreement`,
  );
  assert.equal(agreement.payload.sections.length, 30);
  assert.equal(agreement.payload.summary.total, 30);
  assert.equal(
    agreement.payload.sections.find((section) => section.number === 5).shares.total,
    100,
  );

  const demo = apiClient(baseUrl);
  await demo.post('/auth/login', {
    email: DEMO_ARCHITECT_EMAIL,
    password: DEMO_ARCHITECT_PASSWORD,
  });
  const demoPartnerships = await demo.get('/partnerships');
  assert.equal(demoPartnerships.payload.length, 1);
  const demoPartnership = demoPartnerships.payload[0];
  assert.match(demoPartnership.name, /Кофейня/);
  const demoSessions = await demo.get(`/partnerships/${demoPartnership.id}/sessions`);
  assert.equal(demoSessions.payload.length, 1);
  const demoClauses = await demo.get(
    `/partnerships/${demoPartnership.id}/sessions/${demoSessions.payload[0].id}/clauses`,
  );
  assert.equal(demoClauses.payload.length, 30);
  assert.equal(demoClauses.payload.filter((clause) => clause.status === 'agreed').length, 24);

  await userA.delete(`/partnerships/${partnershipId}`);
  await userA.delete(`/partnerships/${tooSmallPartnership.payload.id}`);
  await userA.get(`/partnerships/${partnershipId}`, 404);
}

async function main() {
  const dbPort = await freePort();
  const apiPort = await freePort();
  const db = await databaseDriver(dbPort);
  const databaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${dbPort}/${POSTGRES_DB}`;
  let apiProcess;

  try {
    log(`using database driver: ${db.name}`);
    await db.up(dbPort);
    await db.wait(dbPort);

    await run('pnpm', ['--filter', '@psa/api', 'db:deploy'], {
      env: { DATABASE_URL: databaseUrl },
    });
    await run('pnpm', ['--filter', '@psa/api', 'db:seed'], {
      env: { DATABASE_URL: databaseUrl },
    });
    await runExpectFailure('pnpm', ['--filter', '@psa/api', 'db:seed:demo'], {
      env: { DATABASE_URL: databaseUrl, DEMO_ARCHITECT_PASSWORD: '' },
    });
    for (let i = 0; i < 2; i += 1) {
      await run('pnpm', ['--filter', '@psa/api', 'db:seed:demo'], {
        env: {
          DATABASE_URL: databaseUrl,
          DEMO_ARCHITECT_EMAIL,
          DEMO_ARCHITECT_PASSWORD,
        },
      });
    }
    if (process.env.PSA_E2E_SKIP_API_BUILD !== '1') {
      await run('pnpm', ['--filter', '@psa/api', 'build'], {
        env: { DATABASE_URL: databaseUrl, AUTH_JWT_SECRET },
      });
    }

    log(`starting API on 127.0.0.1:${apiPort}`);
    apiProcess = spawn('pnpm', ['--filter', '@psa/api', 'start'], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(apiPort),
        DATABASE_URL: databaseUrl,
        AUTH_JWT_SECRET,
        AUTH_COOKIE_SECURE: 'false',
        AUTH_REGISTRATION_CODE,
        AUTH_ADMIN_EMAIL,
        AUTH_ADMIN_PASSWORD,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    apiProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
    apiProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
    apiProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`[e2e] API exited with code ${code}`);
      }
    });

    const baseUrl = `http://127.0.0.1:${apiPort}`;
    await waitFor(async () => {
      const response = await fetch(`${baseUrl}/health`);
      return response.status === 200;
    }, 'API health');
    await runApiAssertions(baseUrl);
    log('all assertions passed');
  } finally {
    if (apiProcess && !apiProcess.killed) {
      apiProcess.kill('SIGTERM');
      await delay(500);
      if (!apiProcess.killed) {
        apiProcess.kill('SIGKILL');
      }
    }
    await db.down(dbPort).catch((error) => {
      console.error(`[e2e] cleanup failed: ${error.message}`);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
