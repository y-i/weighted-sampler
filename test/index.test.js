import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CreateWeightedSamplerError, createWeightedSampler } from "weighted-sampler";

describe("createWeightedSampler", () => {
  test("creates a sampler from separate values and weights", () => {
    const randomValues = [0.1, 0.4, 0.6];
    const sampler = createWeightedSampler(["a", "b"], [1, 3], {
      randomFn: () => randomValues.shift(),
    });

    assert.equal(sampler.sample(), "a");
    assert.equal(sampler.sample(), "b");
    assert.equal(sampler.sample(), "b");
  });

  test("creates a sampler from weighted value objects", () => {
    const randomValues = [0, 0.999_999];
    const sampler = createWeightedSampler(
      [
        { value: "never", weight: 0 },
        { value: "always", weight: 1 },
      ],
      { randomFn: () => randomValues.shift() },
    );

    assert.equal(sampler.sample(), "always");
    assert.equal(sampler.sample(), "always");
  });

  test("throws the public error type for inconsistent lengths", () => {
    assert.throws(
      () => createWeightedSampler(["a"], [1, 2]),
      (error) =>
        error instanceof CreateWeightedSamplerError && error.message === "Length inconsistency",
    );
  });

  const invalidWeightCases = [
    { name: "negative", weights: [-1, 2] },
    { name: "all zero", weights: [0, 0] },
    { name: "NaN", weights: [Number.NaN, 1] },
    { name: "infinite", weights: [Number.POSITIVE_INFINITY, 1] },
    { name: "overflowing total", weights: [Number.MAX_VALUE, Number.MAX_VALUE] },
  ];

  for (const { name, weights } of invalidWeightCases) {
    test(`throws the public error type for ${name} weights`, () => {
      assert.throws(
        () => createWeightedSampler(["a", "b"], weights),
        (error) =>
          error instanceof CreateWeightedSamplerError && error.message === "Invalid weights",
      );
    });
  }

  test("throws the public error type for empty weighted data", () => {
    assert.throws(
      () => createWeightedSampler([]),
      (error) => error instanceof CreateWeightedSamplerError && error.message === "Invalid args",
    );
  });
});

describe("WeightedSampler.sampleMany", () => {
  test("returns the requested number of samples using the provided random source", () => {
    const randomValues = [0.1, 0.6, 0.2, 0.8];
    const sampler = createWeightedSampler(["a", "b"], [1, 1], {
      randomFn: () => randomValues.shift(),
    });

    assert.deepEqual(sampler.sampleMany(randomValues.length), ["a", "b", "a", "b"]);
  });
});
