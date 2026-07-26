# weighted-sampler

A zero-dependency library for weighted sampling using Walker's alias method.

## What is Walker's alias method?

Walker's alias method is an algorithm that enables weighted sampling in constant time.

## Installation

```sh
npm install weighted-sampler
```

## Usage

Weights must be finite, non-negative numbers, and their total must be greater than zero.
They do not need to be normalized.

### Class-style API

The primary API creates a reusable sampler object. Build it once, then call `sample()` or
`sampleMany()` as often as needed.

```js
import { createWeightedSampler } from "weighted-sampler";

const sampler = createWeightedSampler(["common", "uncommon", "rare"], [80, 15, 5]);

const value = sampler.sample();
const tenValues = sampler.sampleMany(10);
```

You can also provide the values and weights together:

```js
const sampler = createWeightedSampler([
  { value: "common", weight: 80 },
  { value: "uncommon", weight: 15 },
  { value: "rare", weight: 5 },
]);
```

`createWeightedSampler()` throws a `CreateWeightedSamplerError` when its input is invalid.
Pass `randomFn` to use a custom source of random numbers:

```js
const sampler = createWeightedSampler(["heads", "tails"], [1, 1], {
  randomFn: () => 0.25,
});
```

### Functional API

The core entry point exposes the alias table and sampling operations separately.
`tryCreateWeightedSampler()` returns a result object instead of throwing an error.

```js
import { sample, sampleMany, tryCreateWeightedSampler } from "weighted-sampler/core";

const result = tryCreateWeightedSampler([
  { value: "common", weight: 80 },
  { value: "uncommon", weight: 15 },
  { value: "rare", weight: 5 },
]);

if (!result.ok) {
  console.error(result.error);
} else {
  const value = sample(result.value);
  const tenValues = sampleMany(result.value, 10);
}
```

## Running the benchmark

Install the development dependencies, then run:

```sh
npm install
npm run benchmark
```

The benchmark builds the library and measures sampler construction and sampling for
10 to 1,000,000 weighted elements. By default, it performs 100,000 warmup samples
and five measured runs of 1,000,000 samples for each element count.

Use the command-line options to shorten or customize a run:

```sh
npm run benchmark -- --samples 100000 --warmup 10000 --runs 3
```

Run `npm run benchmark -- --help` to list all available options.
