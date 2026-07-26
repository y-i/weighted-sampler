export type AliasTable<T> = {
  readonly values: readonly T[];
  readonly probabilities: Float64Array;
  readonly aliases: Uint32Array;
  readonly randomFn: () => number;
};

export type CreateWeightedSamplerResult<T> =
  | { ok: true; value: AliasTable<T> }
  | { ok: false; error: "Length inconsistency" | "Invalid weights" | "Invalid args" };

export type SamplerOptions = {
  randomFn?: () => number;
};

export function tryCreateWeightedSampler<T>(
  values: readonly T[],
  weights: readonly number[],
  options?: SamplerOptions,
): CreateWeightedSamplerResult<T>;
export function tryCreateWeightedSampler<T>(
  data: readonly { value: T; weight: number }[],
  options?: SamplerOptions,
): CreateWeightedSamplerResult<T>;
export function tryCreateWeightedSampler<T>(...args: any[]): CreateWeightedSamplerResult<T> {
  if (args.length === 0) {
    return { ok: false, error: "Invalid args" };
  }

  let options = args.pop();
  if (Array.isArray(options)) {
    args.push(options);
    options = undefined;
  }

  if (args.length > 2) {
    return { ok: false, error: "Invalid args" };
  }

  if (args.length === 1) {
    if (args[0].length === 0) {
      return { ok: false, error: "Invalid args" };
    }

    const data = args[0] as readonly { value: T; weight: number }[];
    const values = data.map((d) => d.value);
    const weights = data.map((d) => d.weight);

    return tryCreateWeightedSampler(values, weights, options);
  }

  const values = args[0] as readonly T[];
  const rawWeights = args[1] as readonly number[];

  if (values.length !== rawWeights.length) {
    return { ok: false, error: "Length inconsistency" };
  }

  if (rawWeights.some((w) => !Number.isFinite(w) || w < 0)) {
    return { ok: false, error: "Invalid weights" };
  }

  const weightsSum = rawWeights.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(weightsSum) || weightsSum === 0) {
    return { ok: false, error: "Invalid weights" };
  }

  let weights = rawWeights.map((w) => (w / weightsSum) * values.length);
  let aliases = Array.from({ length: values.length }, () => 0);
  let probabilities = Array.from({ length: values.length }, () => 1);

  const smallIndices = weights.map((w, i) => (w < 1 ? i : -1)).filter((i) => i !== -1);
  const largeIndices = weights.map((w, i) => (w >= 1 ? i : -1)).filter((i) => i !== -1);
  while (smallIndices.length > 0 && largeIndices.length > 0) {
    const smallIndex = smallIndices.pop()!;
    const largeIndex = largeIndices.pop()!;

    probabilities[smallIndex] = weights[smallIndex]!;
    aliases[smallIndex] = largeIndex;

    weights[largeIndex]! -= 1 - weights[smallIndex]!;
    if (weights[largeIndex]! < 1) {
      smallIndices.push(largeIndex);
    } else {
      largeIndices.push(largeIndex);
    }
  }

  return {
    ok: true,
    value: {
      values,
      probabilities: new Float64Array(probabilities),
      aliases: new Uint32Array(aliases),
      randomFn: options?.randomFn ?? Math.random,
    },
  };
}

export function sample<T>(table: AliasTable<T>): T {
  const n = table.values.length;
  const r = table.randomFn() * n;
  const index = Math.floor(r);
  const v = r - index;

  return v < table.probabilities[index]!
    ? table.values[index]!
    : table.values[table.aliases[index]!]!;
}

export function sampleMany<T>(table: AliasTable<T>, times: number): T[] {
  return Array.from({ length: times }, () => sample(table));
}
