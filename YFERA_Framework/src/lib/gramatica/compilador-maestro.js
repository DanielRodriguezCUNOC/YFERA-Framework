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
    parser.yy = parser.yy || {};
    return parser.parse(input);
  } catch (err) {
    // Si no es un error de los que ya capturamos nosotros, lo relanzamos
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

  /**
   * Compila un proyecto de YFERA completo.
   * @param {Object} fuentes - Objeto con los contenidos de los archivos (principal, estilos, componentes, db)
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
      // Identificar archivos relevantes
      const stylesFiles = Object.keys(fuentes).filter(name => name.endsWith('.styles') || name.endsWith('.style'));
      const componentsFiles = Object.keys(fuentes).filter(name => name.endsWith('.comp'));
      const principalFiles = Object.keys(fuentes).filter(name => name.endsWith('.y') || name.endsWith('.principal'));

      // Compilar Estilos
      let astEstilosGlobal = [];
      for (const fileName of stylesFiles) {
        try {
          const ast = safeParse(stylesParser, fuentes[fileName]);
          if (Array.isArray(ast)) {
            astEstilosGlobal.push(...ast);
          }
        } catch (e) {
          // Ya se capturan en recolectarErroresParser
        }
        this.recolectarErroresParser(stylesParser, 'Sintáctico (Estilo)', 'Léxico (Estilo)');
      }

      if (astEstilosGlobal.length > 0) {
        const resEstilos = compilarEstilos(astEstilosGlobal);
        if (resEstilos.ok) {
          resultados.css = resEstilos.css;
        } else {
          this.errores.push(...resEstilos.errores);
        }
      }

      //Compilar Componentes
      let astComponentesGlobal = [];
      for (const fileName of componentsFiles) {
        try {
          const ast = safeParse(componentsParser, fuentes[fileName]);
          if (Array.isArray(ast)) {
            astComponentesGlobal.push(...ast);
          }
        } catch (e) {
          // Ya se capturan en recolectarErroresParser
        }
        this.recolectarErroresParser(componentsParser, 'Sintáctico (Componente)', 'Léxico (Componente)');
      }

      if (astComponentesGlobal.length > 0) {
        // Análisis Semántico de Componentes
        const resSemantico = analizarComponentes(astComponentesGlobal);
        if (!resSemantico.ok) {
          this.errores.push(...resSemantico.errores);
        } else {
          simbolosCruzados.componentes = resSemantico.tablaSimbolos;
          resultados.js += generadorComponentes.generar(astComponentesGlobal) + '\n';
        }
      }

      // Compilar Base de Datos
      let astDBGlobal = [];
      const dbFiles = Object.keys(fuentes).filter(name => name.endsWith('.db') || name.endsWith('.sqlite'));
      for (const fileName of dbFiles) {
        try {
          const ast = safeParse(dbParser, fuentes[fileName]);
          if (Array.isArray(ast)) astDBGlobal.push(...ast);
        } catch (e) {
          // Ya se capturan en recolectarErroresParser
        }
        this.recolectarErroresParser(dbParser, 'Sintáctico (DB)', 'Léxico (DB)');
      }

      if (astDBGlobal.length > 0) {
        const resSemDB = analizarDB(astDBGlobal);
        if (!resSemDB.ok) {
          this.errores.push(...resSemDB.errores);
        } else {
          simbolosCruzados.tablas = resSemDB.tablaSimbolos;
          resultados.js += generadorDB.generar(astDBGlobal) + '\n';
        }
      }

      // Compilar Lógica Principal
      let astPrincipalGlobal = [];
      for (const fileName of principalFiles) {
        try {
          const ast = safeParse(principalParser, fuentes[fileName]);
          if (Array.isArray(ast)) astPrincipalGlobal.push(...ast);
        } catch (e) {
          // Ya se capturan en recolectarErroresParser
        }
        this.recolectarErroresParser(principalParser, 'Sintáctico (Principal)', 'Léxico (Principal)');
      }

      if (astPrincipalGlobal.length > 0) {
        const resSemPrinc = analizarPrincipal(astPrincipalGlobal, simbolosCruzados);
        if (!resSemPrinc.ok) {
          this.errores.push(...resSemPrinc.errores);
        } else {
          resultados.js += generadorLogica.generar(astPrincipalGlobal) + '\n';
        }
      }

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
