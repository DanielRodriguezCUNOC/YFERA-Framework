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
        } else if (tipo === '.y' || tipo === '.principal') {
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
          resultados.js += generadorComponentes.generar(astComponentesGlobal) + '\n';
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
   * Genera el HTML final tipo SPA (en linea asi como Svelte jaja).
   */
  generarBundle(resultados) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>YFERA App</title>
    <style>
        ${resultados.css}
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
        ${resultados.js}
    </script>
</body>
</html>
    `;
  }
}

export const compilador = new CompiladorMaestro();
export default CompiladorMaestro;
