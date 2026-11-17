type Listener = (...args: any[]) => void;

export let defaultMaxListeners = 10;

export function EventEmitter(this: any) {
  if (!(this instanceof EventEmitter)) {
    return new (EventEmitter as any)();
  }
  const self = this as any;
  self._events = self._events || {};
  self._maxListeners = self._maxListeners || defaultMaxListeners;
}

EventEmitter.prototype.on = function (event: string, listener: Listener) {
  this._events = this._events || {};
  if (!this._events[event]) this._events[event] = [];
  this._events[event].push(listener);
  return this;
};

EventEmitter.prototype.addListener = EventEmitter.prototype.on;

EventEmitter.prototype.once = function (event: string, listener: Listener) {
  const self = this;
  const onceWrapper: Listener = function (...args: any[]) {
    self.off(event, onceWrapper);
    listener.apply(self, args);
  };
  return this.on(event, onceWrapper);
};

EventEmitter.prototype.off = function (event: string, listener: Listener) {
  this._events = this._events || {};
  if (!this._events[event]) return this;
  this._events[event] = this._events[event].filter((l: Listener) => l !== listener);
  return this;
};

EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

EventEmitter.prototype.removeAllListeners = function (event?: string) {
  this._events = this._events || {};
  if (event) {
    delete this._events[event];
  } else {
    this._events = {};
  }
  return this;
};

EventEmitter.prototype.emit = function (event: string, ...args: any[]): boolean {
  this._events = this._events || {};
  const listeners: Listener[] | undefined = this._events[event];
  if (!listeners || listeners.length === 0) return false;
  [...listeners].forEach((l) => l.apply(this, args));
  return true;
};

EventEmitter.prototype.listenerCount = function (event: string): number {
  this._events = this._events || {};
  return this._events[event]?.length || 0;
};

EventEmitter.prototype.setMaxListeners = function (n: number) {
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.getMaxListeners = function (): number {
  return this._maxListeners || defaultMaxListeners;
};

export function setMaxListeners(n: number, ...eventTargets: any[]): void {
  defaultMaxListeners = n;
  for (const target of eventTargets) {
    if (target && typeof target.setMaxListeners === 'function') {
      target.setMaxListeners(n);
    }
  }
}

export function listenerCount(emitter: any, event: string): number {
  if (emitter && typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(event);
  }
  return 0;
}

export function getEventListeners(emitter: any, event: string): Listener[] {
  if (emitter && emitter._events && emitter._events[event]) {
    return [...emitter._events[event]];
  }
  return [];
}

export function once(emitter: any, name: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!emitter) return resolve([]);
    const onEvent = (...args: any[]) => {
      if (typeof emitter.off === 'function') emitter.off('error', onError);
      resolve(args);
    };
    const onError = (err: any) => {
      if (typeof emitter.off === 'function') emitter.off(name, onEvent);
      reject(err);
    };
    if (typeof emitter.once === 'function') {
      emitter.once(name, onEvent);
      emitter.once('error', onError);
    } else if (typeof emitter.addEventListener === 'function') {
      emitter.addEventListener(name, (ev: any) => resolve([ev]), { once: true });
    }
  });
}

export async function* on(emitter: any, event: string): AsyncGenerator<any[], void, unknown> {
  const queue: any[][] = [];
  let resolveNext: ((val: IteratorResult<any[], void>) => void) | null = null;

  const handler = (...args: any[]) => {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r({ value: args, done: false });
    } else {
      queue.push(args);
    }
  };

  if (emitter && typeof emitter.on === 'function') {
    emitter.on(event, handler);
  }

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        const nextVal = await new Promise<IteratorResult<any[], void>>((resolve) => {
          resolveNext = resolve;
        });
        if (nextVal.done) break;
        yield nextVal.value;
      }
    }
  } finally {
    if (emitter && typeof emitter.off === 'function') {
      emitter.off(event, handler);
    }
  }
}

(EventEmitter as any).EventEmitter = EventEmitter;
(EventEmitter as any).setMaxListeners = setMaxListeners;
(EventEmitter as any).defaultMaxListeners = defaultMaxListeners;
(EventEmitter as any).once = once;
(EventEmitter as any).on = on;
(EventEmitter as any).listenerCount = listenerCount;
(EventEmitter as any).getEventListeners = getEventListeners;

export default EventEmitter;
