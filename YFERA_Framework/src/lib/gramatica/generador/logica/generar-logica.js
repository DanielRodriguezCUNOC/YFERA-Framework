/**
 * Generador de código para la lógica principal de YFERA.
 * Traduce sentencias de renderizado y control de flujo a JavaScript.
 */

class GeneradorLogica {
  constructor() {
    this.codigoRender = '';
  }

  quitarPrefijo(str, prefijo) {
    if (str === null || str === undefined) return str;
    const s = String(str);
    if (s.startsWith(prefijo)) return s.slice(prefijo.length);
    return s;
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
        const args = (inv.args || []).map(a => {
          if (a && typeof a === 'object') {
            if (a.valor !== undefined && typeof a.valor === 'string') {
              // Normalizar variables que vengan con prefijo $
              return this.quitarPrefijo(a.valor, '$');
            }
            return JSON.stringify(a);
          }
          return JSON.stringify(a);
        }).join(', ');

        return `${indent}const appContainer = document.getElementById('app');\n` +
               `${indent}if (appContainer) {\n` +
               `${indent}  // Limpiar contenedor\n` +
               `${indent}  while (appContainer.firstChild) appContainer.removeChild(appContainer.firstChild);\n` +
               `${indent}  const __resultComp = (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.execute === 'function') ? YFERA.execute('${inv.componente}', ${args}) : ${inv.componente}(${args});\n` +
               `${indent}  if (__resultComp && __resultComp.nodeType) { appContainer.appendChild(__resultComp); } else if (typeof __resultComp === 'string') { appContainer.innerHTML = __resultComp; } else if (window.DocumentFragment && __resultComp instanceof DocumentFragment) { appContainer.appendChild(__resultComp); } else { try { appContainer.appendChild(__resultComp); } catch (e) { console.error('No se pudo montar el componente', e); } }\n` +
               `${indent}}`;

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
