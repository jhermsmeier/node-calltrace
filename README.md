
# CallTrace [![build status](https://secure.travis-ci.org/jhermsmeier/node-calltrace.png)](http://travis-ci.org/jhermsmeier/node-calltrace) [![NPM version](https://badge.fury.io/js/calltrace.png)](https://npmjs.org/calltrace)


## Install with [npm](https://npmjs.org/)

```sh
$ npm install calltrace
```

## Usage

```javascript
var trace = require( 'calltrace' )
```

Calltrace will emit `capture` events, keep in mind to bind to them:

```javascript
trace.on( 'capture', function( info ) {
  console.log( info )
})
```

Where the `info` will consist of an object with the following
properties:

- *String* **name**: name of captured function
- *Function* **fn**: original (replaced) function,
- *Array* **argv**: array of arguments passed into the function
- *Number* **time**: milliseconds spent int the function
- *Object* **stack**: verbose stack trace, if enabled

In case you want to monitor a globally available function:

```javascript
trace.capture( 'require' ) // OR
trace.capture( 'require.resolve' )
```

Or, if you want to keep an eye on a method you only have access to in this scope:

```javascript
trace.capture( someObject.subPath, 'methodName' )
```

Also, in case you want to turn off stack trace capturing,
pass `false` as last parameter to `capture()`:

```javascript
trace.capture( 'fn', false ) // OR
trace.capture( bla, 'methodName', false )
```
