import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { sample, sampleMany, tryCreateWeightedSampler } from "weighted-sampler/core";

describe("tryCreateWeightedSampler", () => {
  test("creates an alias table from separate values and weights when zero weights are allowed", () => {
    let randomFnCalls = 0;
    const result = tryCreateWeightedSampler(["never", "always"], [0, 1], {
      allowZeroWeights: true,
      randomFn: () => {
        randomFnCalls += 1;
        return 0.5;
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail(result.error);
    }

    assert.equal(sample(result.value), "always");
    assert.equal(randomFnCalls, 1);
  });

  test("creates an alias table from weighted value objects when zero weights are allowed", () => {
    const result = tryCreateWeightedSampler(
      [
        { value: "never", weight: 0 },
        { value: "always", weight: 1 },
      ],
      { allowZeroWeights: true, randomFn: () => 0.999_999 },
    );

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail(result.error);
    }

    assert.equal(sample(result.value), "always");
  });

  test("returns an invalid weights error when zero weights are not allowed", () => {
    assert.deepEqual(
      tryCreateWeightedSampler(["never", "always"], [0, 1], { allowZeroWeights: false }),
      {
        ok: false,
        error: "Invalid weights",
      },
    );
  });

  test("returns a length inconsistency error", () => {
    assert.deepEqual(tryCreateWeightedSampler(["a"], [1, 2]), {
      ok: false,
      error: "Length inconsistency",
    });
  });

  test("returns an invalid weights error", () => {
    assert.deepEqual(tryCreateWeightedSampler(["a", "b"], [0, 0]), {
      ok: false,
      error: "Invalid weights",
    });
  });

  test("returns an invalid args error", () => {
    assert.deepEqual(tryCreateWeightedSampler(), {
      ok: false,
      error: "Invalid args",
    });
  });
});

describe("sampleMany", () => {
  test("returns multiple samples using the alias table random source", () => {
    const randomValues = [0.1, 0.6, 0.2, 0.8];
    let randomFnCalls = 0;
    const result = tryCreateWeightedSampler(["a", "b"], [1, 1], {
      randomFn: () => {
        randomFnCalls += 1;
        return randomValues.shift();
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      assert.fail(result.error);
    }

    assert.deepEqual(sampleMany(result.value, randomValues.length), ["a", "b", "a", "b"]);
    assert.equal(randomFnCalls, 4);
  });
});
