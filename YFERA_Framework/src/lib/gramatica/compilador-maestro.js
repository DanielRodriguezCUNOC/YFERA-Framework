import { compilarEstilos } from './generador/estilos/compilar-estilos.js';
import { generadorComponentes } from './generador/componentes/generar-componentes.js';
import { analizarComponentes } from './semantica/semantic-components.js';
import { analizarDB } from './semantica/semantic-db.js';
import { generadorDB } from './generador/db/generar-db.js';
import { analizarPrincipal } from './semantica/semantic-principal.js';
import { generadorLogica } from './generador/logica/generar-logica.js';
// Parsers generados
import stylesParser from './lexer-parser/grammar-styles.js';
import componentsParser from './lexer-parser/grammar-components.js';
import dbParser from './lexer-parser/grammar-DB.js';
import principalParser from './lexer-parser/principal-grammar.js';

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

  /**
   * Compila un proyecto de YFERA completo.
   * @param {Object} fuentes - Objeto con los contenidos de los archivos (principal, estilos, componentes, db)
   */
  async compilar(fuentes) {
    this.errores = [];
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
          const ast = stylesParser.parse(fuentes[fileName]);
          if (Array.isArray(ast)) {
            astEstilosGlobal.push(...ast);
          }
        } catch (e) {
          this.registrarError('Sintáctico (Estilo)', e.message, { 
            linea: e.hash?.line, 
            columna: e.hash?.loc?.first_column,
            lexema: e.hash?.token
          });
        }
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
          const ast = componentsParser.parse(fuentes[fileName]);
          if (Array.isArray(ast)) {
            astComponentesGlobal.push(...ast);
          }
        } catch (e) {
          this.registrarError('Sintáctico (Componente)', e.message, { 
            linea: e.hash?.line, 
            columna: e.hash?.loc?.first_column,
            lexema: e.hash?.token
          });
        }
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
          const ast = dbParser.parse(fuentes[fileName]);
          if (Array.isArray(ast)) astDBGlobal.push(...ast);
        } catch (e) {
          this.registrarError('Sintáctico (DB)', e.message, { 
            linea: e.hash?.line, 
            columna: e.hash?.loc?.first_column,
            lexema: e.hash?.token
          });
        }
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
          const ast = principalParser.parse(fuentes[fileName]);
          if (Array.isArray(ast)) astPrincipalGlobal.push(...ast);
        } catch (e) {
          this.registrarError('Sintáctico (Principal)', e.message, { 
            linea: e.hash?.line, 
            columna: e.hash?.loc?.first_column,
            lexema: e.hash?.token
          });
        }
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
