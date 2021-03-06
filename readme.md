# Proxy Tracker
[![Test][test-pass-img]][test-pass-url]
[![Commit Number][commit-number-img]][commit-number-url]

[test-pass-img]: https://github.com/CitySeventeen/ProxyTracker/workflows/Node.js%20CI/badge.svg
[test-pass-url]: https://github.com/CitySeventeen/ProxyTracker/actions/workflows/node.js.yml

[commit-number-img]: https://img.shields.io/github/commit-activity/m/CitySeventeen/ProxyTracker
[commit-number-url]: https://github.com/CitySeventeen/ProxyTracker/commits/main

# Index
- [Purpose](#purpose)
- [Utilization](#utilization)
- [Proxy Remover](#proxyremover)
- [Derived Class](#derivedclass)
- [Proxy Extension](#proxyextension)
## Purpose
This repository is born to give the chance to separate application logic from error checking and logging, as PragmaticProgrammer and CleanCode practices.

### What bases ProxyTracker on and its power
It bases on Javascript `Proxy`. But for the classic Proxy, writing handler for trap function is uncomfortale.

### with JS Proxy, the use of handler is heavy.
For example, if you want implements a trap for constructor (`new class`) and some traps for called functions into the istance, you should write this:
```js
const callback_check_error = function(...args){/* body */}
const callback_spy1 = function(...args){/* body */}
const callbacl_logger = function(...args){/* body */}
const callback_spy2 = function(...args){/* body */}
const handler_apply = {apply(target, thisArg, body){
    callback_logger(...arguments);
    return target.apply(thisArg, args);
}}
const hanler_get = {get(target, prop, receiver){
    let value = Reflect.get(...arguments);
    if(isValueValidForProxy(value) return new Proxy(valye, handler_apply)
    else return value;
}}
const handler = {construct(target, args){
    callback_spy1(...args)
    callback_check_error(...args)
    callback_logger(...arguments)
    const instance = new target(...args)
    return new Proxy(instance, handler_get)
},
get(target, prop, receiver){
    callback_spy2(property);
    let value = Reflect.get(...arguments);
    if(isValueValidForProxy(value) return new Proxy(value, handler_apply)
    else return value;
}
}
```
### With ProxyTracker
it's enougth to write this:
```js
const handler = [{construct: [callback_spy1, callback_logger, callback_check_error], get: callback_spy2},
```    
Stop. Only this.

## Utilization
### creation of Proxy
`entity_to_track`: Object | Class | Instance | Array | Function
`handler_track`: Object
Return: same type of entity_to_track, as workd [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy)
`handler_track` has keys named in the traps list of [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy), and each value is a function, an array of function and Object, or an Object recursively

```js
const {ProxyTracker} = require('proxy-tracker')
const entity_tracked = new ProxyTracker(entity_to_track, handler_track)
```

### example of logging and check error for a class
```js
const checkErrorConstruct = function(target, [first_arg, second_arg]){assert(typeof fist_arg === 'number' && typeof second_arg === 'number')}
const checkErrorMethod = function(target, thisArg, args){if(target.name === 'sum') assert(typeof args[0] === 'number')}
const logger = console.log;
const entity_to_track = class {
    static staticMethod(arg){return arg}
    constructor(first, second){
        this.value = first + second // it's only ad example
    }
    sum(add){
        this.value += add
        return this.value
    }
}
const handler_track = {apply: logger, construct: [checkErrorConstruct, logger, {get: {apply: [checkErrorMethod, logger]}}]}

const entity_tracked = new ProxyTracker(entity_to_track, handler_track)

// example of use
new entity_tracked('string') // --> assert error
const instance = new entity_tracked(5,8) // --> console.log(entity_tracked, [5,8])
instance.sum('string') // --> assert error
instance.sum(4) // --> console.log([Function sum], thisArg, [4])
```

### choose handler function
From 0.5.0v it is possible to choose the handler according to parameter name
Warning: use it only on ProxyTracker. ProxyExtension must to be still tested.
```js
const entity = {prop: {key: 'value', method(){/**/}, other_method(){}}};
const handler = {get: {FOR: 'method', apply: callback}}
const proxy = new ProxyTracker(entity, handler);

proxy.prop // -> it is not a proxy, because proxy is returned only if param is 'method'

proxy.method() // -> called callback
proxy.other_method() // -> callback is not called.
```

## ProxyRemover
from 0.3.5 is possible to get the origin entity without proxy, also if is returned by trap. Both for ProxyTracker and ProxyExtension

eg of usage
```js
const {ProxyTracker, ProxyRemover} = require('proxy-tracker')

class user_class{}
const handler = {construct: {get: {}}}
const user_class_proxy = new ProxyTracker(user_class) // --> return a Proxy. util.types.isProxy(user_class_proxy) === true
const instance_from_proxy = new user_class_proxy() // --> return a Proxy because there is a trap construct with next get trap
const origin_instance = ProxyRemover(instance_from_proxy) // return instance without proxy. util.types.isProxy(origin_instance) === false
```

## DerivedClass
If you derive a proxy class, the traps has, get, set, construct are keeped.
Only if you overwrite parameters or methods, the trap disappears.
For the construct trap, it is keeped in the derived class.
If you don't want traps to derived class, you must to do use ProxyRemover before deriving the class

## ProxyExtension
from 0.4.0 is possible to use ProxyExtension, similary to ProxyTracker.

The arguments are the same for ProxyTracker, but the last callback is used for the returned value by trap.
If handler permits the return of a proxy, and the value returned from callback is a function or object, then the trap returns a proxy.

### example
```js
const {ProxyExtension} = require('proxy-tracker')
const first_value = 'value'
const value_modified = 'value modified'
const callback_return_value_by_get_apply = function(t, thisarg, args){
            if(args[0]=first_value) return value_modified
            else return Reflect.apply(t, thisarg, args);}
const custom_function = function(st, sd, rd){/* body */}
const callback_log = function(...args){console.log(...args)}
const handler = {apply: [callback_log, callback_return_value_by_apply_trap]}
const proxy = ProxyExtension(custom_function, handler)

proxy(first_value /*, other arguments */) // -> console.log(arguments) and the function return value_modified
proxy(other_value /*, other arguments */) // -> console.log(arguments) and the function return custom_function(other_value /*, other arguments */)
```

### handler
* If handler or sub handler doesn't have any callback, then the value returned by trap is the real value.
* If handler contains more callbacks, only the last callback is used for returning a value by trap.
* If a trap has sub handler, the value returned by trap (real or by last callback) can be a proxy if the value is an Object or a Function.
