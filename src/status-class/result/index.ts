import Result from "./Result"

export function success<T extends ([any] | []) = []>(...args: T) {
  return new Result.Success(...args)
}

export function error<E extends ([any] | []) = []>(...args: E) {
  return new Result.Error(...args)
}

export { Result as ClassStyle }