import { compilarEstilos } from './generador/estilos/compilar-estilos.js';
// Parsers generados
import stylesParser from './lexer-parser/grammar-styles.js';
import componentsParser from './lexer-parser/grammar-components.js';
import dbParser from './lexer-parser/grammar-DB.js';
import principalParser from './lexer-parser/principal-grammar.js';

class CompiladorMaestro {
  constructor() {
    this.errores = [];
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
          this.errores.push({ tipo: 'parser_estilos', archivo: fileName, mensaje: e.message });
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
