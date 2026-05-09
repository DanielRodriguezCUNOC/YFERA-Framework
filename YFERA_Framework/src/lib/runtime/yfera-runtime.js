import { pathToFileURL } from 'url';

const YFERA = {
  _functions: new Map(),
  _components: new Map(),
  _globals: Object.create(null),

  registerFunction(name, fn) {
    if (!name) throw new Error('registerFunction: name required');
    this._functions.set(name, fn);
    try { globalThis[name] = fn; } catch (e) {}
  },

  registerComponent(name, fn) {
    if (!name) throw new Error('registerComponent: name required');
    this._components.set(name, fn);
    try { globalThis[name] = fn; } catch (e) {}
  },

  getSymbol(name) {
    if (!name) return undefined;
    if (this._functions.has(name)) return this._functions.get(name);
    if (this._components.has(name)) return this._components.get(name);
    return globalThis[name];
  },

  setGlobal(name, value) {
    this._globals[name] = value;
    try { globalThis[name] = value; } catch (e) {}
  },

  getGlobal(name) {
    return this._globals[name] !== undefined ? this._globals[name] : globalThis[name];
  },

  execute(name, ...args) {
    const fn = this.getSymbol(name);
    if (typeof fn !== 'function') {
      const err = new Error(`Symbol '${name}' is not a function`);
      err.code = 'NOT_FUNCTION';
      throw err;
    }
    try {
      return fn(...args);
    } catch (e) {
      // Normalizar error
      const err = e instanceof Error ? e : new Error(String(e));
      throw err;
    }
  },

  //* Ejecutar operaciones contra la capa YFERA_DB y normalizar respuesta
  executeDB(op, ...args) {
    const db = typeof globalThis.YFERA_DB !== 'undefined' ? globalThis.YFERA_DB : (this._db || null);
    if (!db) {
      const err = new Error('YFERA_DB no disponible');
      err.code = 'NO_DB';
      throw err;
    }
    if (typeof db[op] !== 'function') {
      const err = new Error(`Operación DB '${op}' no existe`);
      err.code = 'DB_NOOP';
      throw err;
    }
    try {
      const res = db[op](...args);
      //* Normalizar resultado: select -> rows/count, insert/delete -> count
      if (Array.isArray(res)) return { rows: res, count: res.length };
      if (res === undefined || res === null) {
        //* operaciones que no retornan se consideran exitosas (count 1)
        return { rows: [], count: 1 };
      }
      if (typeof res === 'number') return { count: res, rows: [] };
      if (typeof res === 'object') {
        if ('rows' in res || 'count' in res) return res;
        return { rows: [res], count: 1 };
      }
      return { rows: [res], count: 1 };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      err.code = 'DB_ERROR';
      throw err;
    }
  },

  async load(origen, opciones = {}) {
    let modulo = origen;

    if (typeof origen === 'string') {
      const esURL = origen.startsWith('file:') || origen.startsWith('http:') || origen.startsWith('https:') || origen.startsWith('data:') || origen.startsWith('node:');
      modulo = await import(esURL ? origen : pathToFileURL(origen).href);
    } else if (origen && typeof origen.then === 'function') {
      modulo = await origen;
    }

    if (!modulo || typeof modulo !== 'object') {
      const err = new Error('load: módulo inválido');
      err.code = 'INVALID_MODULE';
      throw err;
    }

    const registrar = (nombre, valor, tipoForzado = '') => {
      if (!nombre) return;
      if (typeof valor === 'function') {
        const tipo = tipoForzado || valor.__yferaKind || opciones.kind || 'function';
        if (tipo === 'component') {
          this.registerComponent(nombre, valor);
        } else {
          this.registerFunction(nombre, valor);
        }
        return;
      }
      if (opciones.registerGlobals) {
        this.setGlobal(nombre, valor);
      }
    };

    const procesarMapa = (mapa, tipoForzado = '') => {
      if (!mapa || typeof mapa !== 'object') return;
      for (const [nombre, valor] of Object.entries(mapa)) {
        registrar(nombre, valor, tipoForzado);
      }
    };

    if (modulo.default && typeof modulo.default === 'object' && !Array.isArray(modulo.default)) {
      procesarMapa(modulo.default.functions, 'function');
      procesarMapa(modulo.default.components, 'component');
      procesarMapa(modulo.default.symbols);
      procesarMapa(modulo.default.globals, 'global');
    }

    for (const [nombre, valor] of Object.entries(modulo)) {
      if (nombre === 'default') continue;
      registrar(nombre, valor);
    }

    return modulo;
  }
};

// Exponer globalmente
try {
  globalThis.YFERA = globalThis.YFERA || YFERA;
} catch (e) {}

export default YFERA;
