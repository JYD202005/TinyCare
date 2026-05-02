/**
 * polyfills.ts
 * Must be imported at the very top of the app entry point — before any
 * React Native or WatermelonDB import — so that Hermes's frozen globals
 * are made writable before any library tries to mutate them.
 *
 * Root cause: WatermelonDB (and some React Native internals) extend the
 * global `Event` class and attempt to set instance properties like
 * `this.NONE`, `this.CAPTURING_PHASE`, etc.  In Hermes + New Architecture
 * these constants are defined as non-writable on `Event.prototype`, which
 * throws `TypeError: Cannot assign to read-only property 'NONE'` in strict
 * mode.
 */

const EVENT_CONSTANTS = ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'] as const;

function patchEventConstants() {
  try {
    // Patch both the constructor and its prototype
    const targets: object[] = [];
    if (typeof Event !== 'undefined') {
      targets.push(Event);
      if (Event.prototype) targets.push(Event.prototype);
    }
    // Also patch via global in case the binding is different
    if (typeof global !== 'undefined' && (global as any).Event) {
      const g = (global as any).Event;
      if (!targets.includes(g)) targets.push(g);
      if (g.prototype && !targets.includes(g.prototype)) targets.push(g.prototype);
    }

    for (const target of targets) {
      for (const prop of EVENT_CONSTANTS) {
        const desc = Object.getOwnPropertyDescriptor(target, prop);
        if (desc && desc.writable === false) {
          Object.defineProperty(target, prop, {
            value: desc.value,
            writable: true,
            enumerable: desc.enumerable ?? true,
            configurable: true,
          });
        }
      }
    }
  } catch (_) {
    // Silently ignore — if it fails the app may still crash, but we tried
  }
}

patchEventConstants();
