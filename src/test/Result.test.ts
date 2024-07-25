import { success, error } from "../status-class/result";
// new Success({msg: "yes"}).isOk((data) => {
//   console.log(data.msg)
// })

// function foo() {
//   if (1+1 == 2) {
//     return new Success({type:1});
//   }
//   return new Error('error reason');
// }

// const res = foo();
// if (res.success) {
//   const a = res
//   a.data
// } else {
//   const a = res;
//   a.err
// }


// /*
// type xx<T> = ([] | [T]) & T[];
// type a = xx<number>
// type ttt<T> = [] | [T];
// type b = ttt<number>[1]
// */

// res.isOk(()=>{})

// const y = res.match({
//   isOk(data) {return data},
//   isErr(err) {return {type: 0}}
// })

function foo(flag: boolean) {
  if (flag) {
    // You can return data of any type,
    // and will get type inference at once!
    return success({ greeting: "hello!" });
  }
  // error() can also have params
  return error();
}

[true, false].forEach((item) => {
  // foo is an function which can return Success or Error
  const res = foo(item);
  // Result has FP-style callback apis
  res.isErr(() => {
    // only executed when return Result.Error
    console.log("NO!!! I'm an error!");
  })
  res.isOk((data) => {
    // only executed when return Result.Success
    // type of data is determined by the param passed to success(...)
    console.log("Yes!! I'm an Ok and data is", data);
    // and you will get type inference
    data.greeting;
  })
  res.match({
    // Rust-style match expression
    isOk(data) { console.log("OK from match"); },
    isErr(err) { console.log("Err from match"); },
  })
  // If you don't like FP-style...
  if (res.success) {
    // TypeScript recognize res as Result.Success
    res.data.greeting;
    res.err; // => undefined
  } else {
    // TypeScript recognize res as Result.Error
    res.err;
    // access to res.data will rise a COMPILE-TIME type error
    // res.data.greeting;
    res.data; // => undefined
  }
  // TypeScript compiler can still tell even if props are deconstructed
  const {success} = res;
  if (!success) {
    // TypeScript recognize res as Result.Error
    res.data; // => undefined
  }
  // You can also use the optional chaning directly!
  console.log("Result from null checker:", res.data?.greeting);
})

