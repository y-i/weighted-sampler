import { performance } from "node:perf_hooks";

import { createWeightedSampler } from "../dist/index.js";

const ELEMENT_COUNTS = [10, 100, 1_000, 10_000, 100_000, 1_000_000];
const DEFAULTS = {
  samples: 1_000_000,
  warmup: 100_000,
  runs: 5,
};

function printUsage() {
  console.log(`Usage: npm run benchmark -- [options]

Options:
  --samples <count>  Samples per measured run (default: ${DEFAULTS.samples})
  --warmup <count>   Samples used to warm up each sampler (default: ${DEFAULTS.warmup})
  --runs <count>     Measured runs per element count (default: ${DEFAULTS.runs})
  --help             Show this help`);
}

function parsePositiveInteger(name, rawValue) {
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function parseArgs(args) {
  const options = { ...DEFAULTS };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (!["--samples", "--warmup", "--runs"].includes(arg)) {
      throw new Error(`Unknown option: ${arg}`);
    }

    const rawValue = args[index + 1];
    if (rawValue === undefined) {
      throw new Error(`Missing value for ${arg}`);
    }

    options[arg.slice(2)] = parsePositiveInteger(arg, rawValue);
    index += 1;
  }

  return options;
}

function createFixture(elementCount) {
  const values = Array.from({ length: elementCount }, (_, index) => index);
  const weights = Array.from({ length: elementCount }, (_, index) => (index % 100) + 1);
  return { values, weights };
}

function runSamples(sampler, count) {
  let checksum = 0;
  for (let index = 0; index < count; index += 1) {
    checksum += sampler.sample();
  }
  return checksum;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function benchmarkElementCount(elementCount, options) {
  const fixture = createFixture(elementCount);
  const constructionStartedAt = performance.now();
  const sampler = createWeightedSampler(fixture.values, fixture.weights);
  const constructionMs = performance.now() - constructionStartedAt;

  runSamples(sampler, options.warmup);

  const durations = [];
  let checksum = 0;
  for (let run = 0; run < options.runs; run += 1) {
    const startedAt = performance.now();
    checksum += runSamples(sampler, options.samples);
    durations.push(performance.now() - startedAt);
  }

  const medianMs = median(durations);
  return {
    elements: elementCount,
    samples_per_run: options.samples,
    construction_ms: constructionMs.toFixed(2),
    sampling_median_ms: medianMs.toFixed(2),
    sampling_min_ms: Math.min(...durations).toFixed(2),
    sampling_max_ms: Math.max(...durations).toFixed(2),
    million_samples_per_second: (options.samples / medianMs / 1_000).toFixed(2),
    checksum,
  };
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  printUsage();
  process.exit(1);
}

console.log(
  `WeightedSampler benchmark: ${options.samples.toLocaleString()} samples/run, ` +
    `${options.runs} runs, ${options.warmup.toLocaleString()} warmup samples`,
);

const results = [];
for (const elementCount of ELEMENT_COUNTS) {
  console.error(`Measuring ${elementCount.toLocaleString()} elements...`);
  results.push(benchmarkElementCount(elementCount, options));
}

console.table(results.map(({ checksum: _checksum, ...result }) => result));

if (results.some(({ checksum }) => !Number.isFinite(checksum))) {
  throw new Error("Unexpected non-finite benchmark checksum");
}
