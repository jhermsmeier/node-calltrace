
var Emitter = require( 'async-emitter' )
var __slice = Array.prototype.slice

function Tracer() {
  
  // Inherit from Emitter
  Emitter.call( this )
  
  this.originals = []
  
}

// Inherit from Emitter
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
  return JSON.stringify( this, null, 2 )
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

Tracer.prototype.capture = function( object, method, captureStack ) {
  
  if( typeof object === 'string' ) {
    
    var ref = this.resolve( object )
    
    captureStack = method
    object = ref[0]
    method = ref[1]
    
  }
  
  var original = object[ method ]
  var self = this
  
  this.originals.push([
    object, method, original
  ])
  
  object[ method ] = function patched() {
    
    var start = process.hrtime()
    var retval = original.call( this, arguments )
    var diff = process.hrtime( start )
    
    self.emit( 'capture', {
      name: method,
      fn: original,
      argv: __slice.call( arguments ),
      time: ( diff[0] * 1e9 + diff[1] ) / 1e6,
      stack: captureStack !== false ?
        self.captureStackTrace() : null
    })
    
    return retval
    
  }
  
  return this.revert.bind( this, object, method )
  
}

Tracer.prototype.revert = function( object, method ) {
  
  if( typeof object === 'string' ) {
    var ref = this.resolve( object )
    object = ref[0]
    method = ref[1]
  }
  
  // Look for a stored path
  var path = this.originals.filter(
    function( entry ) {
      return entry[0] === object &&
             entry[1] === method
    }
  )[0]
  
  // Did we have a stored original?
  // If yes, where exactly is it?
  var index = this.originals.indexOf( path )
  
  if( ~index ) {
    // Restore original
    object[ method ] = path[2]
    // Remove from stored originals
    this.originals.splice( index )
    // We succeeded in restoring the original
    return true
  }
  
  // Either we already restored it,
  // or we never traced it in the first place
  return false
  
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
