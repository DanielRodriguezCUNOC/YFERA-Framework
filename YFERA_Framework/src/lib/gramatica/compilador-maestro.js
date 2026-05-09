import { compilarEstilos } from './generador/estilos/compilar-estilos.js';
import { generadorComponentes } from './generador/componentes/generar-componentes.js';
import { analizarComponentes } from './semantica/semantic-components.js';
import { analizarDB } from './semantica/semantic-db.js';
import { generadorDB } from './generador/db/generar-db.js';
import { analizarPrincipal } from './semantica/semantic-principal.js';
import { generadorLogica } from './generador/logica/generar-logica.js';
// Parsers generados
import { parser as stylesParser } from './lexer-parser/grammar-styles.js';
import { parser as componentsParser } from './lexer-parser/grammar-components.js';
import { parser as dbParser } from './lexer-parser/grammar-DB.js';
import { parser as principalParser } from './lexer-parser/principal-grammar.js';

function safeParse(parser, input) {
  if (!parser) throw new Error('Parser no disponible');

  // Limpiar listas de errores previas
  if (parser.erroresLexicos) parser.erroresLexicos.length = 0;
  if (parser.erroresSintacticos) parser.erroresSintacticos.length = 0;

  try {
    /*
     *Reiniciar el contexto del parser en cada llamada para evitar
    * contaminación de estado entre archivos/parses consecutivos.
    */
    parser.yy = {};
    const resultado = parser.parse(input);

    /*
    * Si el parse terminó sin excepción, los errores recuperados no deben
    * bloquear la compilación; se limpian para que no se traten como fatales (a ver si asi se recupera) */
    if (parser.erroresLexicos) parser.erroresLexicos.length = 0;
    if (parser.erroresSintacticos) parser.erroresSintacticos.length = 0;

    return resultado;
  } catch (err) {
    // Si no es un error de los que ya capturamos, lo relanzamos
    // para que el catch del compilador lo maneje como emergencia 
    throw err;
  }
}

class CompiladorMaestro {
  constructor() {
    this.errores = [];
  }

  registrarError(tipo, mensaje, extra = {}) {
    this.errores.push({
      tipo: tipo,
      lexema: extra.lexema || 'N/A',
      linea: extra.linea || '?',
      columna: extra.columna || '?',
      mensaje: mensaje
    });
  }

  recolectarErroresParser(parser, tipoSintactico, tipoLexico) {
    if (parser.erroresLexicos) {
      parser.erroresLexicos.forEach(err => {
        this.registrarError(tipoLexico, err.mensaje, {
          linea: err.linea,
          columna: err.columna,
          lexema: err.lexema
        });
      });
    }
    if (parser.erroresSintacticos) {
      parser.erroresSintacticos.forEach(err => {
        this.registrarError(tipoSintactico, err.mensaje, {
          linea: err.linea,
          columna: err.columna,
          lexema: err.lexema
        });
      });
    }
  }

  extraerImportaciones(contenido) {
    let importaciones = [];
    if (!contenido) return importaciones;

    let index = 0;
    while (true) {
      let importIndex = contenido.indexOf('import', index);
      if (importIndex === -1) {
        break;
      }

      let comillaInicial = contenido.indexOf('"', importIndex);
      if (comillaInicial !== -1) {
        let comillaFinal = contenido.indexOf('"', comillaInicial + 1);
        if (comillaFinal !== -1) {
          let ruta = contenido.substring(comillaInicial + 1, comillaFinal);
          importaciones.push(ruta);
          index = comillaFinal + 1;
        } else {
          index = comillaInicial + 1;
        }
      } else {
        index = importIndex + 'import'.length;
      }
    }
    return importaciones;
  }

  procesarDependencia(rutaActual, fuentes, listaOrdenada, pilaRutas, yaProcesados) {
    // Primero se hace la validación de seguridad, esto para evitar referencias circulares
    if (pilaRutas.indexOf(rutaActual) !== -1) {
      this.registrarError('Dependencia', 'Referencia circular detectada', { lexema: rutaActual });
      return;
    }
    if (yaProcesados.indexOf(rutaActual) !== -1) {
      return; // Ya fue procesado 
    }

    let contenido = fuentes[rutaActual];
    if (contenido === undefined || contenido === null) {
      this.registrarError('Dependencia', 'Archivo no encontrado', { lexema: rutaActual });
      return;
    }

    // Ahora se hace el registro de entrada
    pilaRutas.push(rutaActual);

    // Ahora se hace el escaneo de imports
    let importaciones = this.extraerImportaciones(contenido);

    // Ahora se hace el descenso recursivo
    for (let i = 0; i < importaciones.length; i++) {
      let rutaHija = importaciones[i];
      let rutaAbsolutaHija = rutaHija; // En caso simplificado, asume que es el nombre exacto

      // Se hace la limpieza de la ruta
      if (rutaAbsolutaHija.startsWith('./')) {
        rutaAbsolutaHija = rutaAbsolutaHija.substring(2);
      }

      this.procesarDependencia(rutaAbsolutaHija, fuentes, listaOrdenada, pilaRutas, yaProcesados);
    }

    // Ahora se hace el registro de salida
    pilaRutas.pop(); // Se elimina de la pila de rutas
    yaProcesados.push(rutaActual); // Se agrega a la lista de ya procesados

    let extension = '';
    let puntoIndex = rutaActual.lastIndexOf('.');
    if (puntoIndex !== -1) {
      extension = rutaActual.substring(puntoIndex);
    }

    listaOrdenada.push({
      ruta: rutaActual,
      contenido: contenido,
      tipo: extension
    });
  }

  extraerBloquesComponentesTopLevel(contenido) {
    if (typeof contenido !== 'string' || contenido.length === 0) {
      return [];
    }

    const bloques = [];
    let indice = 0;
    let inicioBloque = null;
    let profundidad = 0;
    let enCadena = null;
    let enComentarioBloque = false;
    let enComentarioLinea = false;

    const esEspacio = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f';

    while (indice < contenido.length) {
      const actual = contenido.charAt(indice);
      const siguiente = indice + 1 < contenido.length ? contenido.charAt(indice + 1) : '';

      if (enComentarioBloque) {
        if (actual === '*' && siguiente === '/') {
          enComentarioBloque = false;
          indice += 2;
          continue;
        }
        indice += 1;
        continue;
      }

      if (enComentarioLinea) {
        if (actual === '\n') {
          enComentarioLinea = false;
        }
        indice += 1;
        continue;
      }

      if (enCadena) {
        if (actual === '\\') {
          indice += 2;
          continue;
        }
        if (actual === enCadena) {
          enCadena = null;
        }
        indice += 1;
        continue;
      }

      if (actual === '/' && siguiente === '*') {
        enComentarioBloque = true;
        indice += 2;
        continue;
      }

      if (actual === '/' && siguiente === '/') {
        enComentarioLinea = true;
        indice += 2;
        continue;
      }

      if (actual === '"' || actual === '\'' || actual === '`') {
        enCadena = actual;
        if (inicioBloque === null && !esEspacio(actual)) {
          inicioBloque = indice;
        }
        indice += 1;
        continue;
      }

      if (inicioBloque === null) {
        if (esEspacio(actual)) {
          indice += 1;
          continue;
        }
        inicioBloque = indice;
      }

      if (actual === '{') {
        profundidad += 1;
      } else if (actual === '}') {
        profundidad -= 1;
        if (profundidad <= 0 && inicioBloque !== null) {
          bloques.push(contenido.slice(inicioBloque, indice + 1));
          inicioBloque = null;
          profundidad = 0;
        }
      }

      indice += 1;
    }

    return bloques;
  }

  /**
   * Compila un proyecto de YFERA completo.
   * @param {Object} fuentes - Objeto con los contenidos de los archivos
   */
  async compilar(fuentes) {
    this.errores = [];
    let simbolosCruzados = {};
    const resultados = {
      html: '',
      css: '',
      js: '',
        bundleJs: '',
      errores: []
    };

    try {
      let listaOrdenada = [];
      let pilaRutas = [];
      let yaProcesados = [];
      let programasPrincipales = [];
      let llavesFuentes = Object.keys(fuentes);

      // Ejecutar algoritmo DFS
      for (let i = 0; i < llavesFuentes.length; i++) {
        this.procesarDependencia(llavesFuentes[i], fuentes, listaOrdenada, pilaRutas, yaProcesados);
      }

      let astEstilosGlobal = [];
      let astComponentesGlobal = [];
      let astDBGlobal = [];
      // COMPILACIÓN EN CASCADA
  
      for (let i = 0; i < listaOrdenada.length; i++) {
        let archivo = listaOrdenada[i];
        let tipo = archivo.tipo;
        let ruta = archivo.ruta;
        let contenido = archivo.contenido;

        if (tipo === '.styles' || tipo === '.style') {
          try {
            const ast = safeParse(stylesParser, contenido);
            if (Array.isArray(ast)) {
              for (let j = 0; j < ast.length; j++) {
                astEstilosGlobal.push(ast[j]);
              }
            }
          } catch (e) {
          }
          this.recolectarErroresParser(stylesParser, 'Sintáctico (Estilo)', 'Léxico (Estilo)');
        } else if (tipo === '.comp') {
          try {
            const bloquesComponentes = this.extraerBloquesComponentesTopLevel(contenido);
            if (bloquesComponentes.length > 0) {
              for (let b = 0; b < bloquesComponentes.length; b++) {
                const ast = safeParse(componentsParser, bloquesComponentes[b]);
                if (Array.isArray(ast)) {
                  for (let j = 0; j < ast.length; j++) {
                    if (ast[j] && typeof ast[j] === 'object') {
                      astComponentesGlobal.push(ast[j]);
                    }
                  }
                }
              }
            } else {
              const ast = safeParse(componentsParser, contenido);
              if (Array.isArray(ast)) {
                for (let j = 0; j < ast.length; j++) {
                  if (ast[j] && typeof ast[j] === 'object') {
                    astComponentesGlobal.push(ast[j]);
                  }
                }
              }
            }
          } catch (e) {
          }
          this.recolectarErroresParser(componentsParser, 'Sintáctico (Componente)', 'Léxico (Componente)');
        } else if (tipo === '.db' || tipo === '.sqlite') {
          try {
            const ast = safeParse(dbParser, contenido);
            if (Array.isArray(ast)) {
              for (let j = 0; j < ast.length; j++) {
                astDBGlobal.push(ast[j]);
              }
            }
          } catch (e) {
          }
          this.recolectarErroresParser(dbParser, 'Sintáctico (DB)', 'Léxico (DB)');
        } else if (tipo === '.y') {
          try {
            const ast = safeParse(principalParser, contenido);
            if (ast) {
              programasPrincipales.push(ast);
            }
          } catch (e) {
          }
          this.recolectarErroresParser(principalParser, 'Sintáctico (Principal)', 'Léxico (Principal)');
        }
      }

      // Evaluar las fases de generación

      // Estilos
      if (astEstilosGlobal.length > 0) {
        const resEstilos = compilarEstilos(astEstilosGlobal);
        if (resEstilos.ok) {
          resultados.css = resEstilos.css;
        } else {
          for (let i = 0; i < resEstilos.errores.length; i++) {
            this.errores.push(resEstilos.errores[i]);
          }
        }
      }

      // Base de Datos
      if (astDBGlobal.length > 0) {
        const resSemDB = analizarDB(astDBGlobal);
        if (!resSemDB.ok) {
          for (let i = 0; i < resSemDB.errores.length; i++) {
            this.errores.push(resSemDB.errores[i]);
          }
        } else {
          simbolosCruzados.tablas = resSemDB.tablaSimbolos;
          resultados.js += generadorDB.generar(astDBGlobal) + '\n';
        }
      }

      // Componentes
      if (astComponentesGlobal.length > 0) {
        // Análisis Semántico de Componentes
        const resSemantico = analizarComponentes(astComponentesGlobal);
        if (!resSemantico.ok) {
          for (let i = 0; i < resSemantico.errores.length; i++) {
            this.errores.push(resSemantico.errores[i]);
          }
        } else {
          simbolosCruzados.componentes = resSemantico.tablaSimbolos;
          resultados.js += generadorComponentes.generar(astComponentesGlobal, { exportar: false }) + '\n';
        }
      }

      // Lógica Principal
      if (programasPrincipales.length > 0) {
        const programaPrincipal = this.combinarProgramasPrincipales(programasPrincipales);
        const resSemPrinc = analizarPrincipal(programaPrincipal, simbolosCruzados);
        if (!resSemPrinc.ok) {
          for (let i = 0; i < resSemPrinc.errores.length; i++) {
            this.errores.push(resSemPrinc.errores[i]);
          }
        } else {
          resultados.js += generadorLogica.generar(programaPrincipal) + '\n';
        }
      }

      resultados.bundleJs = this.generarBundleJs(resultados);
      resultados.html = this.generarBundle(resultados);

      resultados.ok = this.errores.length === 0;
      resultados.errores = this.errores;

      return resultados;
    } catch (error) {
      return {
        ok: false,
        errores: [{ tipo: 'compilacion_maestra', mensaje: error.message }]
      };
    }
  }

  combinarProgramasPrincipales(programas) {
    const combinado = {
      tipo: 'programa',
      imports: [],
      declaraciones: [],
      funciones: [],
      main: { tipo: 'main', sentencias: [] }
    };

    if (!Array.isArray(programas)) {
      return combinado;
    }

    let i = 0;
    while (i < programas.length) {
      const programa = programas[i];
      if (Array.isArray(programa)) {
        combinado.main.sentencias = combinado.main.sentencias.concat(programa);
      } else if (programa && typeof programa === 'object') {
        if (Array.isArray(programa.imports)) {
          combinado.imports = combinado.imports.concat(programa.imports);
        }
        if (Array.isArray(programa.declaraciones)) {
          combinado.declaraciones = combinado.declaraciones.concat(programa.declaraciones);
        }
        if (Array.isArray(programa.funciones)) {
          combinado.funciones = combinado.funciones.concat(programa.funciones);
        }
        if (programa.main) {
          const sentenciasMain = Array.isArray(programa.main)
            ? programa.main
            : Array.isArray(programa.main.sentencias)
              ? programa.main.sentencias
              : Array.isArray(programa.main.cuerpo)
                ? programa.main.cuerpo
                : [];
          combinado.main.sentencias = combinado.main.sentencias.concat(sentenciasMain);
        }
      }
      i += 1;
    }

    return combinado;
  }

  /**
   * Genera el HTML para cargar el bundle.js
   */
  generarBundle(resultados, opciones = {}) {
    const bootstrapSql = this.generarBootstrapSql(opciones.wasmBase64 || '');
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>YFERA App</title>
</head>
<body>
    <div id="app"></div>
    <script src="https://sql.js.org/dist/sql-wasm.js"></script>
    ${bootstrapSql}
    <script src="bundle.js"></script>
</body>
</html>
    `;
  }

  /**
   * Genera una vista previa autocontenida con el bundle inline.
   * Carga sql.js para soporte de .sqlite.
   */
  generarVistaPrevia(resultados, opciones = {}) {
    const bundleJs = resultados.bundleJs || resultados.js || '';
    const bootstrapSql = this.generarBootstrapSql(opciones.wasmBase64 || '');
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vista previa YFERA</title>
</head>
<body>
    <div id="app"></div>
    <script src="https://sql.js.org/dist/sql-wasm.js"><\/script>
    ${bootstrapSql}
    <script>
${bundleJs}
    </script>
</body>
</html>
    `;
  }

  generarBootstrapSql(wasmBase64) {
    if (typeof wasmBase64 !== 'string' || wasmBase64.length === 0) {
      return '';
    }

    const base64Seguro = wasmBase64.replace(/</g, '\\u003c');
    return `<script>
(function () {
  if (typeof initSqlJs !== 'function') return;
  const __wasmBase64 = '${base64Seguro}';
  const __originalInitSqlJs = initSqlJs;
  const __wasmBinary = Uint8Array.from(atob(__wasmBase64), function (c) { return c.charCodeAt(0); }).buffer;
  window.initSqlJs = function (options) {
    options = options || {};
    options.wasmBinary = __wasmBinary;
    return __originalInitSqlJs(options);
  };
})();
</script>`;
  }

  /**
   * Genera un único archivo JS autocontenido con runtime, DB, componentes,
   * lógica principal e inyección de CSS.
   */
  generarBundleJs(resultados) {
    const css = JSON.stringify(resultados.css || '');
    const runtime = this.generarRuntimeBundle();
    const logica = resultados.js || '';

    return `
${runtime}

// CSS embebido por el compilador
const __YFERA_CSS = ${css};
if (typeof document !== 'undefined' && __YFERA_CSS) {
  let __style = document.getElementById('__yfera_bundle_styles__');
  if (!__style) {
    __style = document.createElement('style');
    __style.id = '__yfera_bundle_styles__';
    __style.textContent = __YFERA_CSS;
    document.head.appendChild(__style);
  }
}

(async () => {
  if (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.initDb === 'function') {
    try {
      await YFERA.initDb();
    } catch (error) {
      console.warn('No se pudo inicializar YFERA_DB antes de cargar la lógica:', error);
    }
  }

${logica}
})();
`;
  }

  /**
   * Runtime browser-safe para el bundle único con sql.js + IndexedDB.
   */
  generarRuntimeBundle() {
    return `const YFERA = (() => {
  const runtime = {
    _functions: new Map(),
    _components: new Map(),
    _globals: Object.create(null),
    _sqlDb: null,
    _dbReady: false,

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
        const err = new Error('Symbol ' + name + ' is not a function');
        err.code = 'NOT_FUNCTION';
        throw err;
      }
      try {
        return fn(...args);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        throw err;
      }
    },

    async load(origen, opciones = {}) {
      let modulo = origen;

      if (typeof origen === 'string') {
        const esURL = origen.startsWith('file:') || origen.startsWith('http:') || origen.startsWith('https:') || origen.startsWith('data:') || origen.startsWith('blob:');
        const url = esURL ? origen : new URL(origen, document.baseURI).href;
        modulo = await import(url);
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
    },

    async initDb() {
      if (this._dbReady) return;
      try {
        if (typeof initSqlJs === 'undefined') {
          console.warn('sql.js no disponible; BD funcionará en modo lectura.');
          return;
        }
        const SQL = await initSqlJs();
        let data = null;
        try {
          const idbReq = indexedDB.open('YFERA_DB', 1);
          const obj = await new Promise((res, rej) => {
            idbReq.onupgradeneeded = (e) => {
              try {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('sqlite')) {
                  db.createObjectStore('sqlite', { keyPath: 'id' });
                }
              } catch (err) {
                // ignore
              }
            };
            idbReq.onsuccess = () => res({ db: idbReq.result });
            idbReq.onerror = () => rej(idbReq.error || new Error('IndexedDB open error'));
          });

          try {
            const db = obj.db;
            if (db && db.objectStoreNames && db.objectStoreNames.contains('sqlite')) {
              const tx = db.transaction('sqlite', 'readonly');
              const store = tx.objectStore('sqlite');
              const req = store.get('main');
              data = await new Promise((res, rej) => {
                req.onsuccess = () => res(req.result ? req.result.data : null);
                req.onerror = () => res(null);
              });
            }
          } catch (e) {
            // ignore read errors, fallback to empty DB
            data = null;
          }
        } catch (e) {
          console.warn('IndexedDB no disponible o inaccesible:', e);
        }
        if (data) {
          this._sqlDb = new SQL.Database(new Uint8Array(data));
        } else {
          this._sqlDb = new SQL.Database();
        }
        this._dbReady = true;
      } catch (e) {
        console.error('Error inicializando DB:', e);
      }
    },

    async saveDb() {
      if (!this._sqlDb || !this._dbReady) return;
      try {
        const data = this._sqlDb.export();
        const idb = indexedDB.open('YFERA_DB', 1);
        await new Promise((res, rej) => {
          idb.onsuccess = () => {
            const tx = idb.result.transaction('sqlite', 'readwrite');
            const store = tx.objectStore('sqlite');
            store.put({ id: 'main', data: Array.from(data) });
            tx.oncomplete = res;
            tx.onerror = rej;
          };
          idb.onerror = () => {
            const req = indexedDB.open('YFERA_DB', 1);
            req.onupgradeneeded = (e) => {
              e.target.result.createObjectStore('sqlite', { keyPath: 'id' });
            };
            res();
          };
        });
      } catch (e) {
        console.warn('No se pudo guardar en IndexedDB:', e);
      }
    },

    executeDB(op, ...args) {
      if (op === 'raw' && this._sqlDb && this._dbReady) {
        try {
          const query = args[0];
          if (!query) throw new Error('Query no proporcionada');
          const stmts = this._sqlDb.prepare(query);
          const results = [];
          while (stmts.step()) {
            results.push(stmts.getAsObject());
          }
          stmts.free();
          this.saveDb();
          return { rows: results, count: results.length };
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          err.code = 'DB_ERROR';
          throw err;
        }
      }
      const db = typeof globalThis.YFERA_DB !== 'undefined' ? globalThis.YFERA_DB : null;
      if (!db) {
        console.error('YFERA_DB no disponible: La base de datos no se ha inicializado o db/sql.js no está enlazado.');
        return { rows: [], count: 0 };
      }
      if (typeof db[op] !== 'function') {
        const err = new Error('Operación DB ' + op + ' no existe');
        err.code = 'DB_NOOP';
        throw err;
      }
      try {
        const res = db[op](...args);
        if (Array.isArray(res)) return { rows: res, count: res.length };
        if (res === undefined || res === null) return { rows: [], count: 1 };
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
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => runtime.initDb());
    if (document.readyState !== 'loading') runtime.initDb();
  }

  try { globalThis.YFERA = globalThis.YFERA || runtime; } catch (e) {}
  return globalThis.YFERA;
})();`;
  }
}

export const compilador = new CompiladorMaestro();
export default CompiladorMaestro;
