import { compilarEstilos } from './generador/estilos/compilar-estilos.js';
// Los siguientes importarán los parsers generados por Jison
// import principalParser from './lexer-parser/principal-grammar.js';
// import componentsParser from './lexer-parser/grammar-components.js';
// import dbParser from './lexer-parser/grammar-DB.js';

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
      // 1. Compilar Estilos
      // Asumimos que fuentes.estilos es el AST o el código fuente
      // Si es código fuente, primero hay que parsearlo.
      // Por ahora usamos la base que ya existe.
      if (fuentes.astEstilos) {
        const resEstilos = compilarEstilos(fuentes.astEstilos);
        if (resEstilos.ok) {
          resultados.css = resEstilos.css;
        } else {
          this.errores.push(...resEstilos.errores);
        }
      }

      // 2. Pendiente: Compilar Componentes
      // 3. Pendiente: Compilar Lógica Principal y DB

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
   * Genera el HTML final tipo SPA.
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
