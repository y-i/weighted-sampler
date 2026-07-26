import {
  sample,
  sampleMany,
  tryCreateWeightedSampler,
  type AliasTable,
  type SamplerOptions,
} from "./core/index.js";

export interface WeightedSampler<T> {
  sample(): T;
  sampleMany(times: number): T[];
}

export class CreateWeightedSamplerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateWeightedSamplerError";
  }
}

export function createWeightedSampler<T>(
  values: readonly T[],
  weights: readonly number[],
  options?: SamplerOptions,
): WeightedSamplerImpl<T>;
export function createWeightedSampler<T>(
  data: readonly { value: T; weight: number }[],
  options?: SamplerOptions,
): WeightedSamplerImpl<T>;
export function createWeightedSampler<T>(...args: any[]): WeightedSamplerImpl<T> {
  const result =
    args.length === 1
      ? tryCreateWeightedSampler<T>(args[0])
      : Array.isArray(args[1])
        ? tryCreateWeightedSampler<T>(args[0], args[1], args[2])
        : tryCreateWeightedSampler<T>(args[0], args[1]);

  if (!result.ok) {
    throw new CreateWeightedSamplerError(result.error);
  }

  return new WeightedSamplerImpl<T>(result.value);
}

class WeightedSamplerImpl<T> implements WeightedSampler<T> {
  private table: AliasTable<T>;

  constructor(table: AliasTable<T>) {
    this.table = table;
  }

  sample(): T {
    return sample(this.table);
  }

  sampleMany(times: number): T[] {
    return sampleMany(this.table, times);
  }
}
