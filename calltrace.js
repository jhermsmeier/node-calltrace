
var Emitter = require( 'async-emitter' )
var __slice = Array.prototype.slice

function Tracer() {
  Emitter.call( this )
  this.functions = {}
}

require( 'util' ).inherits(
  Tracer, Emitter
)

Tracer.Frame = function( callSite ) {
  
  this.name = callSite.getFunctionName()
  this.name = this.name || '<anonymous>'
  
  this.function = callSite.getFunction()
  this.arguments = this.function.arguments
  
  this.file = callSite.getFileName()
  this.line = callSite.getLineNumber()
  this.column = callSite.getColumnNumber()
  
  this.native = callSite.isNative()
  this.constructor = callSite.isConstructor()
  
}

Tracer.prototype.toString = function() {
  return JSON.stringify( this )
}

Tracer.prototype.resolve = function( path ) {
  
  var tree = path.split( /\./g )
  var branch, root = tree.shift()
  var object = global[ root ]
  var method = tree.pop()
  
  if( object == null ) {
    try { object = require( root ) }
    catch( e ) { void e }
  }
  
  if( method == null && object ) {
    method = root
    object = global
  }
  
  while( branch = tree.shift() ) {
    object = object[ branch ]
  }
  
  return [ object, method ]
  
}

Tracer.prototype.capture = function( path ) {
  
  var ref = this.resolve( path )
  var object = ref[0], method = ref[1]
  var original = object[ method ]
  var self = this
  
  this.functions[ path ] = original
  
  object[ method ] = function patched() {
    
    var start = process.hrtime()
    var retval = original.call( this, arguments )
    var diff = process.hrtime( start )
    
    self.emit( 'capture', {
      fn: path,
      argv: __slice.call( arguments ),
      time: ( diff[0] * 1e9 + diff[1] ) / 1e6,
      stack: self.captureStackTrace()
    })
    
    return retval
    
  }
  
}

Tracer.prototype.revert = function( path ) {
  
  var ref = this.resolve( path )
  var object = ref[0], method = ref[1]
  
  object[ method ] = this.functions[ path ]
  
  return delete this.functions[ path ]
  
}

Tracer.prototype.captureStackTrace = function() {
  
  var pst = Error.prepareStackTrace
  
  Error.prepareStackTrace = function( _, stack ) { return stack }
  var error = new Error()
  Error.captureStackTrace( error, arguments.callee )
  var trace = error.stack
  Error.prepareStackTrace = pst
  
  var i, stack = []
  var len = trace.length - 1
  
  for( i = 1; i < len; i++ ) {
    stack.push( new Tracer.Frame( trace[i] ))
  }
  
  return stack
  
}

module.exports = new Tracer
