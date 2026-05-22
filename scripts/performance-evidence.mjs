import inspector from 'node:inspector';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const FRONTEND_URL = process.env.TARGET_FRONTEND_URL || 'https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app';
const APDEX_T_MS = Number(process.env.APDEX_T_MS || 500);
const TIMEOUT_MS = Number(process.env.PERF_TIMEOUT_MS || 10000);
const BASELINE_SAMPLES = Number(process.env.PERF_BASELINE_SAMPLES || 2);
const CURRENT_SAMPLES = Number(process.env.PERF_CURRENT_SAMPLES || 5);
const LOAD_REQUESTS = Number(process.env.PERF_LOAD_REQUESTS || 20);
const LOAD_CONCURRENCY = Number(process.env.PERF_LOAD_CONCURRENCY || 4);

const targets = [
  { key: 'frontend-home', name: 'Frontend home', url: `${FRONTEND_URL}/` },
  { key: 'frontend-status', name: 'Frontend status', url: `${FRONTEND_URL}/status` },
  { key: 'auth-health', name: 'Auth/Profile health', url: 'https://auth-profile-api-osvihgaoya-uc.a.run.app/actuator/health' },
  { key: 'inventory-health', name: 'Inventory health', url: 'https://inventory-api-osvihgaoya-uc.a.run.app/actuator/health' },
  { key: 'wallet-health', name: 'Wallet health', url: 'https://wallet-api-osvihgaoya-uc.a.run.app/actuator/health' },
  { key: 'order-health', name: 'Order health', url: 'https://order-api-osvihgaoya-uc.a.run.app/actuator/health' },
  { key: 'voucher-health', name: 'Voucher health', url: 'https://voucher-promo-api-osvihgaoya-uc.a.run.app/health' },
];

function percentile(values, p) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[index].toFixed(2));
}

function summarize(samples) {
  const durations = samples.filter((sample) => sample.ok).map((sample) => sample.durationMs);
  const total = samples.length;
  const failed = samples.filter((sample) => !sample.ok).length;

  return {
    total,
    failed,
    availability: total === 0 ? 0 : Number(((total - failed) / total).toFixed(4)),
    minMs: percentile(durations, 0),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: percentile(durations, 100),
    averageMs: durations.length
      ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2))
      : null,
  };
}

function computeApdex(samples) {
  const satisfied = samples.filter((sample) => sample.ok && sample.durationMs <= APDEX_T_MS).length;
  const tolerating = samples.filter(
    (sample) => sample.ok && sample.durationMs > APDEX_T_MS && sample.durationMs <= APDEX_T_MS * 4,
  ).length;
  const frustrated = samples.length - satisfied - tolerating;
  const score = samples.length === 0 ? 0 : (satisfied + tolerating / 2) / samples.length;

  return {
    thresholdMs: APDEX_T_MS,
    satisfied,
    tolerating,
    frustrated,
    total: samples.length,
    score: Number(score.toFixed(4)),
  };
}

async function timedFetch(target) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(target.url, {
      headers: { Accept: 'application/json,text/html;q=0.9,*/*;q=0.8' },
      signal: controller.signal,
    });
    await response.arrayBuffer();
    const durationMs = Number((performance.now() - startedAt).toFixed(2));

    return {
      target: target.key,
      name: target.name,
      url: target.url,
      ok: response.ok,
      status: response.status,
      durationMs,
    };
  } catch (error) {
    return {
      target: target.key,
      name: target.name,
      url: target.url,
      ok: false,
      status: 0,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function collectRound(label, samplesPerTarget) {
  const samples = [];

  for (let sampleIndex = 0; sampleIndex < samplesPerTarget; sampleIndex += 1) {
    for (const target of targets) {
      samples.push({
        label,
        sampleIndex,
        measuredAt: new Date().toISOString(),
        ...(await timedFetch(target)),
      });
    }
  }

  return samples;
}

async function collectLoadSmoke() {
  const queue = Array.from({ length: LOAD_REQUESTS }, (_, index) => ({
    label: 'load-smoke',
    sampleIndex: index,
    target: targets[index % targets.length],
  }));
  const samples = [];

  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      samples.push({
        label: next.label,
        sampleIndex: next.sampleIndex,
        measuredAt: new Date().toISOString(),
        ...(await timedFetch(next.target)),
      });
    }
  }

  await Promise.all(Array.from({ length: LOAD_CONCURRENCY }, worker));
  return samples;
}

async function withCpuProfile(callback) {
  const session = new inspector.Session();
  session.connect();
  const post = (method) => new Promise((resolve, reject) => {
    session.post(method, (error, result) => (error ? reject(error) : resolve(result)));
  });

  await post('Profiler.enable');
  await post('Profiler.start');
  const result = await callback();
  const profileResult = await post('Profiler.stop');
  session.disconnect();
  return { result, profile: profileResult.profile };
}

function groupedSummary(samples) {
  return Object.fromEntries(
    targets.map((target) => [
      target.key,
      summarize(samples.filter((sample) => sample.target === target.key)),
    ]),
  );
}

function renderMarkdown(report) {
  const rows = targets.map((target) => {
    const before = report.beforeAfter.baseline[target.key];
    const after = report.beforeAfter.current[target.key];
    const delta = before.averageMs === null || after.averageMs === null
      ? 'n/a'
      : `${(after.averageMs - before.averageMs).toFixed(2)} ms`;
    return `| ${target.name} | ${before.averageMs ?? 'n/a'} | ${after.averageMs ?? 'n/a'} | ${after.p95Ms ?? 'n/a'} | ${after.availability} | ${delta} |`;
  });

  return `# Performance, APDEX, Load, and Profiling Evidence

Generated: ${report.generatedAt}

## Scope

This report measures the deployed Cloud Run frontend and every deployed service health endpoint. The "before" sample is the first cold/warm-up pass in the same run; the "after" sample is the steadier pass captured after warm-up. The comparison is meant to be reproducible evidence, not a claim of a specific code optimization.

## APDEX

- Threshold T: ${report.apdex.thresholdMs} ms
- Satisfied: ${report.apdex.satisfied}
- Tolerating: ${report.apdex.tolerating}
- Frustrated: ${report.apdex.frustrated}
- Score: ${report.apdex.score}

## Before/After Latency

| Target | Before avg ms | After avg ms | After p95 ms | After availability | Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows.join('\n')}

## Load Smoke

- Requests: ${report.load.requests}
- Concurrency: ${report.load.concurrency}
- Availability: ${report.load.summary.availability}
- p95 latency: ${report.load.summary.p95Ms} ms

## Profiling Artifact

CPU profile: \`reports/performance/cloudrun-smoke.cpuprofile\`

Raw JSON: \`reports/performance/performance-apdex-current.json\`
`;
}

const outputDir = new URL('../reports/performance/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const { result, profile } = await withCpuProfile(async () => {
  const baselineSamples = await collectRound('before-warmup', BASELINE_SAMPLES);
  const currentSamples = await collectRound('after-warmup', CURRENT_SAMPLES);
  const loadSamples = await collectLoadSmoke();
  return { baselineSamples, currentSamples, loadSamples };
});

const report = {
  generatedAt: new Date().toISOString(),
  targetFrontendUrl: FRONTEND_URL,
  apdex: computeApdex(result.currentSamples),
  beforeAfter: {
    baseline: groupedSummary(result.baselineSamples),
    current: groupedSummary(result.currentSamples),
  },
  load: {
    requests: LOAD_REQUESTS,
    concurrency: LOAD_CONCURRENCY,
    summary: summarize(result.loadSamples),
    byTarget: groupedSummary(result.loadSamples),
  },
  samples: {
    baseline: result.baselineSamples,
    current: result.currentSamples,
    load: result.loadSamples,
  },
};

await writeFile(new URL('performance-apdex-current.json', outputDir), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(new URL('performance-apdex-report.md', outputDir), renderMarkdown(report));
await writeFile(new URL('cloudrun-smoke.cpuprofile', outputDir), `${JSON.stringify(profile)}\n`);

console.log(`APDEX ${report.apdex.score} with T=${APDEX_T_MS}ms`);
console.log(`Load smoke p95 ${report.load.summary.p95Ms}ms across ${LOAD_REQUESTS} requests`);
