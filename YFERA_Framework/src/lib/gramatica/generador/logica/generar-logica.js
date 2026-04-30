/**
 * Generador de código para la lógica principal de YFERA.
 * Traduce sentencias de renderizado y control de flujo a JavaScript.
 */

class GeneradorLogica {
  constructor() {
    this.codigoRender = '';
  }

  generar(ast) {
    if (!Array.isArray(ast)) return '';

    let codigo = '// Lógica principal YFERA\n';
    codigo += 'window.addEventListener("load", () => {\n';
    
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo) {
        codigo += this.generarSentencia(nodo, 2) + '\n';
      }
      i += 1;
    }

    codigo += '});\n';
    return codigo;
  }

  generarSentencia(nodo, indentSize = 0) {
    const indent = ' '.repeat(indentSize);
    
    switch (nodo.tipo) {
      case 'render':
        const inv = nodo.invocacion;
        const args = (inv.args || []).map(a => JSON.stringify(a)).join(', ');
        return `${indent}const appContainer = document.getElementById('app');\n${indent}if(appContainer) appContainer.innerHTML = ${inv.componente}(${args});`;

      case 'if':
        let res = `${indent}if (${this.generarExpresion(nodo.condicion)}) {\n`;
        // ... cuerpo
        res += `${indent}}`;
        return res;

      default:
        return `${indent}// Sentencia principal no implementada: ${nodo.tipo}`;
    }
  }

  generarExpresion(expr) {
    if (typeof expr !== 'object') return String(expr);
    return expr.valor || String(expr);
  }
}

export const generadorLogica = new GeneradorLogica();
export default GeneradorLogica;
