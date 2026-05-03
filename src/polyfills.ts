/**
 * polyfills.ts
 *
 * Root cause: WatermelonDB (and some React Native internals) extend the
 * global `Event` class and attempt to set instance properties like
 * `this.NONE`, `this.CAPTURING_PHASE`, etc.  In Hermes + New Architecture
 * these constants are defined as non-writable on `Event.prototype`, which
 * throws `TypeError: Cannot assign to read-only property 'NONE'` in strict
 * mode.
 */

function patchEventConstants() {
  try {
    var globalObj = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : window;
    
    if (globalObj.Event && !(globalObj.Event as any).__patched) {
      var OriginalEvent = globalObj.Event;
      
      // Wrapper que hereda de Event
      var PatchedEvent = function(type: any, options: any) {
        return Reflect.construct(OriginalEvent, [type, options], PatchedEvent);
      };
      
      // Copiar estáticos
      Object.setPrototypeOf(PatchedEvent, OriginalEvent);
      
      // Configurar herencia
      PatchedEvent.prototype = Object.create(OriginalEvent.prototype);
      PatchedEvent.prototype.constructor = PatchedEvent;
      
      // Redefinir propiedades conflictivas como WRITABLE
      var PROPS = { NONE: 0, CAPTURING_PHASE: 1, AT_TARGET: 2, BUBBLING_PHASE: 3 };
      for (var key in PROPS) {
        Object.defineProperty(PatchedEvent.prototype, key, {
          value: (PROPS as any)[key],
          writable: true, 
          configurable: true,
          enumerable: true
        });
      }
      
      (PatchedEvent as any).__patched = true;
      globalObj.Event = PatchedEvent as any;
    }
  } catch (err) {
    console.warn('[TinyCare] Error patching Event in polyfills.ts:', err);
  }
}

patchEventConstants();
