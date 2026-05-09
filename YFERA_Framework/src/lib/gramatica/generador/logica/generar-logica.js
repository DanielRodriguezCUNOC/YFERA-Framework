/**
 * Generador de código para la lógica principal de YFERA.
 * Traduce sentencias de renderizado y control de flujo a JavaScript.
 */

function stripBackticks(s) {
  if (typeof s !== 'string' || s.length < 2) return s;
  if (s.charAt(0) === '`' && s.charAt(s.length - 1) === '`') return s.slice(1, -1);
  return s;
}

function interpolateDollarForTemplate(s) {
  if (typeof s !== 'string' || s.length === 0) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch === '$') {

      let j = i + 1;
      let name = '';
      while (j < s.length) {
        const c = s.charAt(j);
        const isAlpha = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
        const isAlnum = isAlpha || (c >= '0' && c <= '9');
        if (j === i + 1 && !isAlpha) break;
        if (!isAlnum) break;
        name += c;
        j += 1;
      }
      if (name.length > 0) {
        out += '${' + name + '}';
        i = j - 1;
        continue;
      }
      out += '$';
    } else {
      out += ch;
    }
  }
  return out;
}

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

      case 'execute':
       
        {
          let q = nodo.consulta || '';
          if (typeof q === 'string') q = stripBackticks(q);
          // reemplazar $var por ${var} para interpolación en tiempo de ejecución
          q = interpolateDollarForTemplate(q);
          return `${indent}if (typeof YFERA !== 'undefined' && typeof YFERA.executeDB === 'function') { YFERA.executeDB('raw', ` + '`' + `${q}` + '`' + `); }`;
        }

      case 'arreglo_execute':
        // Asignar resultado de consulta a una variable o array en tiempo de ejecución
        {
          const id = nodo.id || 'resultado';
          let q = nodo.consulta || '';
          if (typeof q === 'string') q = stripBackticks(q);
          q = interpolateDollarForTemplate(q);
          return `${indent}const ${id} = (typeof YFERA !== 'undefined' && typeof YFERA.executeDB === 'function') ? YFERA.executeDB('raw', ` + '`' + `${q}` + '`' + `) : [];`;
        }

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
