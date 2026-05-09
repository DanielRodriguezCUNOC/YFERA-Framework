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
      let llavesFuentes = Object.keys(fuentes);

      // Ejecutar algoritmo DFS
      for (let i = 0; i < llavesFuentes.length; i++) {
        this.procesarDependencia(llavesFuentes[i], fuentes, listaOrdenada, pilaRutas, yaProcesados);
      }

      let astEstilosGlobal = [];
      let astComponentesGlobal = [];
      let astDBGlobal = [];
      let astPrincipalGlobal = [];

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
            const ast = safeParse(componentsParser, contenido);
            if (Array.isArray(ast)) {
              for (let j = 0; j < ast.length; j++) {
                astComponentesGlobal.push(ast[j]);
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
            if (Array.isArray(ast)) {
              for (let j = 0; j < ast.length; j++) {
                astPrincipalGlobal.push(ast[j]);
              }
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
      if (astPrincipalGlobal.length > 0) {
        const resSemPrinc = analizarPrincipal(astPrincipalGlobal, simbolosCruzados);
        if (!resSemPrinc.ok) {
          for (let i = 0; i < resSemPrinc.errores.length; i++) {
            this.errores.push(resSemPrinc.errores[i]);
          }
        } else {
          resultados.js += generadorLogica.generar(astPrincipalGlobal) + '\n';
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

  /**
   * Genera el HTML para cargar el bundle.js
   */
  generarBundle(resultados) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>YFERA App</title>
</head>
<body>
    <div id="app"></div>
    <script src="bundle.js"></script>
</body>
</html>
    `;
  }

  /**
   * Genera una vista previa autocontenida con el bundle inline.
   */
  generarVistaPrevia(resultados) {
    const bundleJs = resultados.bundleJs || resultados.js || '';
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
    <script>
${bundleJs}
    </script>
</body>
</html>
    `;
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

${logica}
`;
  }

  /**
   * Runtime browser-safe para el bundle único.
   */
  generarRuntimeBundle() {
    return `const YFERA = (() => {
  const runtime = {
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

    executeDB(op, ...args) {
      const db = typeof globalThis.YFERA_DB !== 'undefined' ? globalThis.YFERA_DB : (this._db || null);
      if (!db) {
        const err = new Error('YFERA_DB no disponible');
        err.code = 'NO_DB';
        throw err;
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

  try { globalThis.YFERA = globalThis.YFERA || runtime; } catch (e) {}
  return globalThis.YFERA;
})();`;
  }
}

export const compilador = new CompiladorMaestro();
export default CompiladorMaestro;
