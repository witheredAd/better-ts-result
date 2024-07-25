export type Result<
  T extends ([any] | []) = [], 
  E extends ([any] | []) = [],
> = Success<T> | Error<E>;

class BaseResult<Flag extends boolean> {
  constructor(public success: Flag) {}
}

export class Success<
  T extends ([U] | []) & U[],
  U = T extends[infer K] ? K : undefined
> extends BaseResult<true> {
  public data: U;
  public err = undefined;
  constructor(...args: T) {
    super(true);
    this.data = args[0];
  }
  public isOk<R>(f: (data: U) => R) {
    return f(this.data);
  }
  public isErr<R>(f: (err: never) => R) { }
  public match<R, S>(callbacks: {
    isOk: (data: U) => R,
    isErr: (err: never) => S,
  }) {
    return this.isOk(callbacks.isOk)
  }
}

export class Error<
  E extends ([U] | []) & U[],
  U = E extends[infer K] ? K : undefined
> extends BaseResult<false> {
  public err: U;
  public data = undefined;
  constructor(...args: E) {
    super(false);
    this.err = args[0];
  }

  public isOk<R>(f: (data: never) => R) { }
  public isErr<R>(f: (err: U) => R) {
    return f(this.err);
  }
  public match<R, S>(callbacks: {
    isOk: (data: never) => R,
    isErr: (err: U) => S,
  }) {
    return this.isErr(callbacks.isErr)
  }
}

export default {
  Success,
  Error
}