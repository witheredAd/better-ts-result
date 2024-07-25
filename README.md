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
	// (parameter) args: [U] | []
	// Error:
	// Type 'U | undefined' is not assignable to type 'U'.
	//   Type 'undefined' is not assignable to type 'U'.
	return args[0];
}
```
WTF it works

I used to think that, `T extends ([U] | []) & U[]` restrictst that T can only be `[]` or `[U]`; then, if T is `[U]`, we know `[U] & U[]` is `[U]` so `[U][0]` is `[U]`; if T is `[]`, `([] & U[])[0]` is `never`. So, we define `U` as `... : undefined`. Then if t is [], U will be undefined. and this makes it complete.