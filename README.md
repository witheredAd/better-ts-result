# better-ts

A TypeScript implemention of Result objects.

Features:

 - Pure TS
 - No overload signatures
 - No type assertion
 - No cast through `any` or `unknown`

Requires TypeScript >= 4.4.4, which is because:

 - TS 4.3.5 adds rule: 
	params in func covariant type will become union types of each item
	
	, which results in:
	`((data: never) => void) & ((data: U) => void) ==> ((data: U) => void)`

	before that, the infered type is always `((data: any) => void)`
 - TS 4.4.4 adds rule: `[...T]`

Also set `strictNullChecks` to `true` in `tsconfig.json`.

## Usage

```ts
import { success, error } from "better-ts-result";

// An function that will return success with data, or error
function foo(flag: boolean) {
  if (flag) {
    return success({ greeting: "hello!" });
  }
  return error(/* You may pass err msg here, or you can just leave it empty */);
}

const res = foo(true);
// TS style
if (res.success) {
	// res.data has compile-time type inference
	res.data.greeting;
	// res.err is undefined
} else {
	// res.err also has compile-time type inference
	res.err;
	// res.data is undefined
}
// Rust-style
res.match({
  isOk(data) { console.log("OK from match"); },
  isErr(err) { console.log("Err from match"); },
});
// One-side expectation
res.isErr((err) => {
	// err is what you pass to error(...)
	//  - if you don't pass anything, err is undefined
	//  - whatever you pass, err has compile-time type inference
  console.log("Err:", err);
});
// Optional chaining
// - if no assertion is made, res.data is T | undefined
res.data?.greeting ?? "";
```

## Principle

### How to make TS responsive to the number of params

TypeScript determines generic type and normal parameter type notation in different stages. Consider how to make a function return `undefined` if no param is given, and the param itself if only one param is given:

```ts
// Expected behavior:
foo();  // undefined
foo(123);  // number
```

An apparent idea is to use generic types. So we may have:

```ts
function foo<T>(arg?: T): T {
	// Error: Type 'T | undefined' is not assignable to type 'T'...
	return arg;  // typeof args ==> T | undefined
}
```

Here you see the problem. If we want to make the param optional, we should add `?`, which means `arg` is now of type `T | undefined`. Therefore, `T` will lose control on the type of `arg`, so it will never know if `arg` is not given!

Experienced TypeScript programmers may choose to implement this by function overloads. Yes, it's easy and fast. But TS won't do much work on checking the consistency between your definition and your declarations. It means that, such implementation lacks protection from TS compiler, which should be avoided.

Fortunately, we can use an argument list to represent all the parameters the function receives, and attach generic type `T` on the list, so that `T` can capture all param types in one type:

```ts
declare function foo<T extends any[]>(...args: T): void;
foo();  // T ==> []
foo(1, "");	 // T ==> [number, string]
```

As you can see, T will be instantiated as a tuple type with precise type definition once the argument list `args` is given.

As T is a tuple type, we can access its member like `T[0]`:

```ts
declare function foo<T extends any[]>(...args: T): T[0];
foo(1, "");	 // number
```

So far, it's possible to pass more than one parameters to `foo`. This can be restricted by narrowing the generic type `T`:

```ts
declare function foo<T extends [any] | []>(...args: T): T[0];
foo();	// ok, T ==> []
foo("");  // ok, T ==> [string]

// Error:
// Argument of type '[number, string]' is not assignable to parameter of type '[any] | []'.
//  Type '[number, string]' is not assignable to type '[any]'.
//    Source has 2 element(s) but target allows only 1.
foo(1, "");	 // <args wants to be [number, string]>
```

Although we have got the declaration, there's still some tricks in the implementation:

```ts
function foo<T extends [any] | []>(...args: T): T[0] {
	// (parameter) args: [any] | []
	return args[0];
}
```

As you can see, `args` falls back to `[any] | []`, and `args[0]` is of type `any`. Clearly, there happens an implied type cast from `any` to `T[0]`. As `any` can be casted to and from any types, such behavior is also somewhat risky. You can check that by simply change the return type `T[0]` to any other types, such as `number`, and no errors will be generated:

```ts
function foo<T extends [any] | []>(...args: T): number {
	// (parameter) args: [any] | []
	return args[0];  // Implied type cast (any -> number), no error!
}
foo("str");  // TS: number, but runtime result: "str"
```

To make type of `args` more precise, we may not use `[any]` to narrow the generic type. Instead, use another generic type `U`:

```ts
function foo<T extends [U] | [], U>(...args: T): T[0] {
	// T[0]: U | undefined
	// (parameter) args: [U] | []
	return args[0];  // U | undefined
}
foo("str");  // T ==> [string], U ==> unknown
```

Now there's no `any` in the code any more. However, actually it works in an odd way. On the one hand, `U` remains to be `unknown`; On the other hand, the reason why the return value is compatible to the declaration, is that `args[0]` is considered to be `U | undefined`, which is the same as `T[0]`. But T is changable, and if you substitue `return args[0]` with `return undefined`, you will find the problem:

```ts
function foo<T extends [U] | [], U>(...args: T): T[0] {
	// T[0]: U | undefined
	return undefined;  // no error! undefined extends (U | undefined)
}
foo("str");  // TS: string, but runtime result: undefined
```

So, in short, we need to make the return type an type responsive to `T` (which means it should be a generic type), with the ability to describe the EXACT type of `args[0]`. How?

We want to return the value of `args[0]`, so let's examine the type of `args[0]` (or `T[0]`, for `args` is of type `T`). As we have restricted `T` to be either `[]` or `[U]`, we know that, when `T ==> []` we have `args[0] ==> undefined`, and when `T ==> [some-type]` we have `args[0] ==> some-type`.

Let's redefine `U` to imitate that logic:

```ts
function foo<
	T extends [U] | [],
	U = T extends [infer K] ? K : undefined
>(...args: T): U {
	// (parameter) args: [U] | []

	// Error:
	// Type 'U | undefined' is not assignable to type 'U'.
	//   'U' could be instantiated with an arbitrary type which could be unrelated to 'U | undefined'.
	return args[0];
}
foo();  // T ==> [], U ==> undefined
foo("str");  // T ==> [string], U ==> string
```

In this piece of code, the inference of U works as expected. However, the return value becomes incompatible. As the compiler complains, TS thinks `args[0]` has the type of `U | undefined`. Why?

That's because `args` has the type of `[U] | []`. Check the code below:

```ts
// number | undefined
type X = ([number] | [])[0]
// number
type X1 = [number][0]
// undefined, and complaints:
//   Tuple type '[]' of length '0' has no element at index '0'.
type X2 = [][0]
```

If we add an covariant calculation on tuples, it will narrow down. So:

```ts
// never
type Y2 = ([] & number[])[0]
// number
type Y1 = ([number] & number[])[0]
// number
type Y = (([number] | []) & number[])[0]
```

If we do so to our generic type `T`, which is `T extends ([U] | []) & U[]`, we can make `T[0] ==> U` forever.

And most interestingly, in this case, if `T ==> []`, we have `U ==> undefined`, so `T[0] ==> U ==> undefined`; if `T ==> [some-type]`, we have `U ==> some-type`, so `T[0] ==> U ==> some-type`. This means `U` now has the ability to describe the exact type of `args[0]`. Wonderful!

So the final code is:

```ts
function foo<
	T extends ([U] | []) & U[],
	U = T extends [infer K] ? K : undefined
>(...args: T): U {
	return args[0];  // U
}
foo();  // T ==> [], U ==> undefined
foo("str");  // T ==> [string], U ==> string
```

You can try to change `return args[0]` to other values, such as `return undefined`, and that will not compile, showing that the implementation is well protected by the compiler.

The proof above is a comprehensive one, and even a case-by-case one. As long as `T` is `[]` or `[some-type]`, the proof is correct.

### Discussion

The code could also be written as:
``` ts
function foo<
	T extends ([U] | []) & U[],
	U = T[0]
>(...args: T): U {
	return args[0];  // U
}
```
which also works.