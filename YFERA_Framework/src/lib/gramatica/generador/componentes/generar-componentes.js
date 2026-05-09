/**
 * Generador de código para la gramática de componentes de YFERA.
 * Transforma el AST de componentes en funciones JavaScript que retornan nodos DOM dinámicos.
 */

class GeneradorComponentes {
  constructor() {
    this.componentes = [];
  }

  esNodoControl(nodo) {
    if (!nodo || typeof nodo !== 'object') {
      return false;
    }

    return nodo.tipo === 'if' || nodo.tipo === 'for' || nodo.tipo === 'for_each_simple' || nodo.tipo === 'for_each_track' || nodo.tipo === 'while' || nodo.tipo === 'switch';
  }

  obtenerBloque(nodo, clavePrincipal = 'cuerpo', claveAlterna = 'sentencias') {
    if (!nodo || typeof nodo !== 'object') {
      return [];
    }

    if (Array.isArray(nodo[clavePrincipal])) {
      return nodo[clavePrincipal];
    }

    if (Array.isArray(nodo[claveAlterna])) {
      return nodo[claveAlterna];
    }

    return [];
  }

  obtenerNombreVariable(valor) {
    if (valor === null || valor === undefined) {
      return '';
    }

    const texto = String(valor);
    return this.quitarPrefijo(texto, '$');
  }

  obtenerTextoSimple(valor) {
    if (valor === null || valor === undefined) {
      return '';
    }

    let texto = String(valor);
    texto = this.eliminarComillas(texto);
    return texto;
  }

  generarListaElementos(elementos, ctx, indentSize) {
    let codigo = '';
    let indice = 0;
    while (indice < elementos.length) {
      codigo += this.generarElemento(elementos[indice], ctx, indentSize);
      indice += 1;
    }
    return codigo;
  }

  generarBloqueCondicional(nodo, ctx, indentSize) {
    const bloquesElseIf = Array.isArray(nodo.elseIfs) ? nodo.elseIfs : [];
    const bloqueElse = nodo.else ? this.obtenerBloque(nodo.else, 'cuerpo', 'sentencias') : [];

    let codigo = `${' '.repeat(indentSize)}if (${this.generarExpresion(nodo.condicion)}) {\n`;
    codigo += this.generarListaElementos(this.obtenerBloque(nodo, 'cuerpo', 'sentencias'), ctx, indentSize + 2);
    codigo += `${' '.repeat(indentSize)}}`;

    let indice = 0;
    while (indice < bloquesElseIf.length) {
      const parte = bloquesElseIf[indice];
      codigo += ` else if (${this.generarExpresion(parte.condicion)}) {\n`;
      codigo += this.generarListaElementos(this.obtenerBloque(parte, 'cuerpo', 'sentencias'), ctx, indentSize + 2);
      codigo += `${' '.repeat(indentSize)}}`;
      indice += 1;
    }

    if (bloqueElse.length > 0) {
      codigo += ` else {\n`;
      codigo += this.generarListaElementos(bloqueElse, ctx, indentSize + 2);
      codigo += `${' '.repeat(indentSize)}}`;
    }

    return codigo + '\n';
  }

  generarBloqueSwitch(nodo, ctx, indentSize) {
    const indent = ' '.repeat(indentSize);
    let codigo = `${indent}switch (${this.generarExpresion(nodo.variable)}) {\n`;

    const casos = Array.isArray(nodo.casos) ? nodo.casos : [];
    let indice = 0;
    while (indice < casos.length) {
      const caso = casos[indice];
      codigo += `${indent}  case ${this.generarExpresion(caso.valor)}:\n`;
      codigo += this.generarListaElementos(this.obtenerBloque(caso, 'cuerpo', 'sentencias'), ctx, indentSize + 4);
      codigo += `${indent}    break;\n`;
      indice += 1;
    }

    if (nodo.defecto && Array.isArray(nodo.defecto.cuerpo)) {
      codigo += `${indent}  default:\n`;
      codigo += this.generarListaElementos(nodo.defecto.cuerpo, ctx, indentSize + 4);
      codigo += `${indent}    break;\n`;
    }

    codigo += `${indent}}\n`;
    return codigo;
  }

  generarBloqueForEachSimple(nodo, ctx, indentSize) {
    const indent = ' '.repeat(indentSize);
    const nombreOrigen = this.obtenerNombreVariable(nodo.origen);
    const nombreItem = this.obtenerNombreVariable(nodo.item);
    const cuerpo = this.obtenerBloque(nodo, 'cuerpo', 'sentencias');
    const vacio = this.obtenerBloque(nodo, 'vacio', 'sentencias');

    let codigo = `${indent}{\n`;
    codigo += `${indent}  const __lista = ${nombreOrigen};\n`;
    codigo += `${indent}  if (Array.isArray(__lista) && __lista.length > 0) {\n`;
    codigo += `${indent}    let __indiceLista = 0;\n`;
    codigo += `${indent}    while (__indiceLista < __lista.length) {\n`;
    codigo += `${indent}      const ${nombreItem} = __lista[__indiceLista];\n`;
    codigo += this.generarListaElementos(cuerpo, ctx, indentSize + 6);
    codigo += `${indent}      __indiceLista += 1;\n`;
    codigo += `${indent}    }\n`;
    codigo += `${indent}  } else {\n`;
    codigo += this.generarListaElementos(vacio, ctx, indentSize + 4);
    codigo += `${indent}  }\n`;
    codigo += `${indent}}\n`;

    return codigo;
  }

  generarBloqueForEachTrack(nodo, ctx, indentSize) {
    const indent = ' '.repeat(indentSize);
    const nombreIndice = this.obtenerNombreVariable(nodo.indice);
    const pares = Array.isArray(nodo.pares) ? nodo.pares : [];
    const cuerpo = this.obtenerBloque(nodo, 'cuerpo', 'sentencias');
    const vacio = this.obtenerBloque(nodo, 'vacio', 'sentencias');

    let codigo = `${indent}{\n`;
    codigo += `${indent}  const __pares = [];\n`;

    let indicePar = 0;
    while (indicePar < pares.length) {
      const par = pares[indicePar];
      const origen = this.obtenerNombreVariable(par.origen);
      const actual = this.obtenerNombreVariable(par.actual);
      codigo += `${indent}  __pares.push({ origen: ${origen}, actual: ${actual} });\n`;
      indicePar += 1;
    }

    codigo += `${indent}  if (__pares.length > 0) {\n`;
    codigo += `${indent}    let ${nombreIndice} = 0;\n`;
    codigo += `${indent}    while (${nombreIndice} < __pares.length) {\n`;
    codigo += `${indent}      const __parActual = __pares[${nombreIndice}];\n`;
    codigo += `${indent}      const __origen = __parActual.origen;\n`;
    codigo += `${indent}      const __actual = __parActual.actual;\n`;
    codigo += this.generarListaElementos(cuerpo, ctx, indentSize + 6);
    codigo += `${indent}      ${nombreIndice} += 1;\n`;
    codigo += `${indent}    }\n`;
    codigo += `${indent}  } else {\n`;
    codigo += this.generarListaElementos(vacio, ctx, indentSize + 4);
    codigo += `${indent}  }\n`;
    codigo += `${indent}}\n`;

    return codigo;
  }

  eliminarComillas(s) {
    if (s === null || s === undefined) return s;
    const str = String(s);
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c !== '"' && c !== "'") out += c;
    }
    return out;
  }

  quitarPrefijo(str, prefijo) {
    if (str === null || str === undefined) return str;
    const s = String(str);
    if (s.startsWith(prefijo)) return s.slice(prefijo.length);
    return s;
  }

  interpolateDollarVars(s) {
    if (s === null || s === undefined) return s;
    const str = String(s);
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '$') {
        let j = i + 1;
        let name = '';
        while (j < str.length) {
          const c = str[j];
          const isWord = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
          if (isWord) { name += c; j++; } else break;
        }
        if (name.length > 0) {
          res += '${' + name + '}';
          i = j - 1;
          continue;
        }
        // si no hay nombre válido, dejar el signo
        res += '$';
      } else {
        res += ch;
      }
    }
    return res;
  }

  /**
   * Genera el código JS para un conjunto de componentes.
   * @param {Array} ast - El AST generado por grammar-components.
   */
  generar(ast, opciones = {}) {
    if (!Array.isArray(ast)) return '';

    let codigo = '// Componentes autogenerados por YFERA\n\n';
    const exportados = [];

    for (const nodo of ast) {
      if (nodo.tipo === 'componente') {
        const nombreComp = nodo.nombre || 'ComponenteAnonimo';
        codigo += this.generarComponente(nodo) + '\n';
        codigo += `if (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.registerComponent === 'function') { YFERA.registerComponent('${nombreComp}', ${nombreComp}); }\n\n`;
        exportados.push(nombreComp);
      }
    }

    if (exportados.length > 0 && opciones.exportar !== false) {
      codigo += `export { ${exportados.join(', ')} };\n`;
    }

    return codigo;
  }

  generarComponente(nodo) {
    const { nombre, parametros, elementos } = nodo;

    const nombreComp = nombre || 'ComponenteAnonimo';
    const paramsStr = (parametros || []).map(p => p.id).join(', ');

    let ctx = {
      counter: 0,
      currentParent: '__fragment',
      formId: null,
      isForm: false
    };

    let cuerpo = `function ${nombreComp}(${paramsStr}) {\n`;
    cuerpo += `  let __fragment = document.createDocumentFragment();\n`;

    for (const elem of elementos) {
      cuerpo += this.generarElemento(elem, ctx, 2);
    }

    cuerpo += `  return __fragment;\n`;
    cuerpo += `}\n`;
    cuerpo += `${nombreComp}.__yferaKind = 'component';\n`;

    return cuerpo;
  }

  generarElemento(nodo, ctx, indentSize = 2) {
    const indent = ' '.repeat(indentSize);
    let codigo = '';
    
    ctx.counter++;
    let currentVar = '__el_' + ctx.counter;

    switch (nodo.tipo) {
      case 'seccion':
        codigo += `${indent}let ${currentVar} = document.createElement("div");\n`;
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        
        let prevParentSeccion = ctx.currentParent;
        ctx.currentParent = currentVar;

        for (const child of nodo.elementos) {
          codigo += this.generarElemento(child, ctx, indentSize + 2);
        }
        
        ctx.currentParent = prevParentSeccion;
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      case 'texto':
        codigo += `${indent}let ${currentVar} = document.createElement("span");\n`;
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        
        //* Reemplazar $var por ${var} para interpolación 
        const contenido = nodo.contenido;
        if (contenido && typeof contenido === 'object') {
          //* expresión AST -> generar código JS y convertir a string
          const exprCode = this.generarExpresion(contenido);
          codigo += `${indent}${currentVar}.textContent = String(${exprCode});\n`;
        } else {
          const contentString = typeof contenido === 'string' ? contenido : '';
          const interpContent = this.interpolateDollarVars(contentString);
          codigo += `${indent}${currentVar}.textContent = \`${interpContent}\`;\n`;
        }
        
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      case 'imagen':
        codigo += `${indent}let ${currentVar} = document.createElement("img");\n`;
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        let fuente = nodo.fuentes && nodo.fuentes[0] ? nodo.fuentes[0].valor : '';
        if (fuente && typeof fuente === 'object') {
          codigo += `${indent}${currentVar}.src = String(${this.generarExpresion(fuente)});\n`;
        } else {
          const interpSrc = this.interpolateDollarVars(String(fuente || ''));
          codigo += `${indent}${currentVar}.src = \`${interpSrc}\`;\n`;
        }
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      case 'if':
        codigo += this.generarBloqueCondicional(nodo, ctx, indentSize);
        break;

      case 'switch':
        codigo += this.generarBloqueSwitch(nodo, ctx, indentSize);
        break;

      case 'for_each_simple':
        codigo += this.generarBloqueForEachSimple(nodo, ctx, indentSize);
        break;

      case 'for_each_track':
        codigo += this.generarBloqueForEachTrack(nodo, ctx, indentSize);
        break;

      case 'tabla':
        codigo += `${indent}let ${currentVar} = document.createElement("table");\n`;
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        
        for (const fila of nodo.filas) {
          ctx.counter++;
          let filaVar = '__el_' + ctx.counter;
          codigo += `${indent}  let ${filaVar} = document.createElement("tr");\n`;
          for (const celda of fila.celdas) {
            ctx.counter++;
            let celdaVar = '__el_' + ctx.counter;
            codigo += `${indent}    let ${celdaVar} = document.createElement("td");\n`;
            
            let prevParentCell = ctx.currentParent;
            ctx.currentParent = celdaVar;
            for (const child of celda.elementos) {
              codigo += this.generarElemento(child, ctx, indentSize + 6);
            }
            ctx.currentParent = prevParentCell;
            
            codigo += `${indent}    ${filaVar}.appendChild(${celdaVar});\n`;
          }
          codigo += `${indent}  ${currentVar}.appendChild(${filaVar});\n`;
        }
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      case 'formulario':
        codigo += `${indent}let ${currentVar} = document.createElement("form");\n`;
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        
        let prevFormId = ctx.formId;
        let prevIsForm = ctx.isForm;
        let prevParentForm = ctx.currentParent;
        
        ctx.formId = currentVar;
        ctx.isForm = true;
        ctx.currentParent = currentVar;
        
        codigo += `${indent}let state_${currentVar} = {};\n`;

        for (const input of nodo.elementos) {
          codigo += this.generarElemento(input, ctx, indentSize + 2);
        }
        if (nodo.submit) {
          codigo += this.generarElemento(nodo.submit, ctx, indentSize + 2);
        }
        
        ctx.currentParent = prevParentForm;
        ctx.formId = prevFormId;
        ctx.isForm = prevIsForm;
        
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      case 'input_text':
      case 'input_number':
      case 'input_bool':
        codigo += `${indent}let ${currentVar}_container = document.createElement("div");\n`;
        codigo += `${indent}let ${currentVar}_label = document.createElement("label");\n`;
        codigo += `${indent}let ${currentVar}_input = document.createElement("input");\n`;
        
        let tipoInput = "text";
        if (nodo.tipo === 'input_number') tipoInput = "number";
        if (nodo.tipo === 'input_bool') tipoInput = "checkbox";
        
        codigo += `${indent}${currentVar}_input.type = "${tipoInput}";\n`;

        let config = nodo.config || { propiedades: [] };
        let idProp = config.propiedades.find(p => p.propiedad === 'id');
        let labelProp = config.propiedades.find(p => p.propiedad === 'label');
        let valId = idProp ? idProp.valor : '';
        let valLabel = labelProp ? labelProp.valor : '';
        
        if (valId) {
          valId = this.eliminarComillas(valId);
          codigo += `${indent}${currentVar}_input.id = "${valId}";\n`;
        }
        if (valLabel) {
          valLabel = this.eliminarComillas(valLabel);
          codigo += `${indent}${currentVar}_label.textContent = "${valLabel}";\n`;
          codigo += `${indent}${currentVar}_label.htmlFor = "${valId}";\n`;
        }
        //* Valor inicial si existe
        let valueProp = config.propiedades.find(p => p.propiedad === 'value');
        if (valueProp && valId) {
          //* valueProp.valor puede ser literal o variable ({ tipo: 'variable', valor: '$x' })
            if (typeof valueProp.valor === 'object' && valueProp.valor.tipo === 'variable') {
            const varName = this.quitarPrefijo(valueProp.valor.valor, '$');
            if (tipoInput === 'checkbox') {
              codigo += `${indent}${currentVar}_input.checked = Boolean(${varName});\n`;
              if (ctx.isForm) codigo += `${indent}state_${ctx.formId}["${valId}"] = ${currentVar}_input.checked;\n`;
            } else {
              codigo += `${indent}${currentVar}_input.value = ${varName};\n`;
              if (ctx.isForm) codigo += `${indent}state_${ctx.formId}["${valId}"] = ${currentVar}_input.value;\n`;
            }
          } else {
            // literal
            const lit = JSON.stringify(valueProp.valor);
            if (tipoInput === 'checkbox') {
              codigo += `${indent}${currentVar}_input.checked = ${lit};\n`;
              if (ctx.isForm) codigo += `${indent}state_${ctx.formId}["${valId}"] = ${currentVar}_input.checked;\n`;
            } else {
              codigo += `${indent}${currentVar}_input.value = ${lit};\n`;
              if (ctx.isForm) codigo += `${indent}state_${ctx.formId}["${valId}"] = ${currentVar}_input.value;\n`;
            }
          }
        }

        if (ctx.isForm && valId) {
          codigo += `${indent}${currentVar}_input.addEventListener('input', function(e) {\n`;
          let valExpr = tipoInput === 'checkbox' ? 'e.target.checked' : 'e.target.value';
          codigo += `${indent}  state_${ctx.formId}["${valId}"] = ${valExpr};\n`;
          codigo += `${indent}});\n`;
        }

        codigo += `${indent}${currentVar}_container.appendChild(${currentVar}_label);\n`;
        codigo += `${indent}${currentVar}_container.appendChild(${currentVar}_input);\n`;
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar}_container);\n`;
        break;

      case 'submit':
        codigo += `${indent}let ${currentVar} = document.createElement("button");\n`;
        codigo += `${indent}${currentVar}.type = "submit";\n`;
        
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        
        let valButton = "Enviar";
        let funcSubmitName = "";
        let funcSubmitArgs = [];

        if (nodo.propiedades) {
           let valProp = nodo.propiedades.find(p => p.propiedad === 'label');
           if (valProp) valButton = (typeof valProp.valor === 'string') ? this.eliminarComillas(valProp.valor) : String(valProp.valor);

           let methodProp = nodo.propiedades.find(p => p.propiedad === 'function');
             if (methodProp) {
             // methodProp.funcion puede venir con prefijo $; normalizar
             funcSubmitName = this.quitarPrefijo((methodProp.funcion || '').toString(), '$');
             const argumentos = methodProp.argumentos || [];
             for (const a of argumentos) {
               if (a.tipo === 'variable') {
                 // variable viene con prefijo $ -> eliminar $
                 funcSubmitArgs.push(this.quitarPrefijo(a.valor, '$'));
               } else if (a.tipo === 'referencia_form') {
                 // referencia de formulario @campo -> usar state del formulario
                 const campo = this.quitarPrefijo(a.valor, '@');
                 funcSubmitArgs.push(`state_${ctx.formId}["${campo}"]`);
               } else {
                 // por seguridad, stringify
                 funcSubmitArgs.push(JSON.stringify(a));
               }
             }
           }
        }

        codigo += `${indent}${currentVar}.textContent = "${valButton}";\n`;

        codigo += `${indent}${currentVar}.addEventListener('click', function(e) {\n`;
        codigo += `${indent}  e.preventDefault();\n`;
        if (ctx.isForm && funcSubmitName) {
            const argsList = funcSubmitArgs.join(', ');
            codigo += `${indent}  if (typeof ${funcSubmitName} === 'function') {\n`;
            codigo += `${indent}    ${funcSubmitName}(${argsList});\n`;
            codigo += `${indent}  } else {\n`;
            codigo += `${indent}    console.error("Función '${funcSubmitName}' no definida en la lógica.");\n`;
            codigo += `${indent}  }\n`;
        }
        codigo += `${indent}});\n`;
        
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      default:
        codigo += `${indent}// Nodo desconocido o no implementado: ${nodo.tipo}\n`;
    }

    return codigo;
  }
  
  generarExpresion(expr) {
     if (expr === null || expr === undefined) return "true";
     if (typeof expr === 'boolean') return expr ? 'true' : 'false';
     if (typeof expr === 'number') return String(expr);
     if (typeof expr === 'string') {
       const texto = expr.trim();
       if (texto.length === 0) return 'true';

       if (texto.charAt(0) === '$') {
         return this.quitarPrefijo(texto, '$');
       }

       const primer = texto.charAt(0);
       const ultimo = texto.charAt(texto.length - 1);
       if ((primer === '"' && ultimo === '"') || (primer === '\'' && ultimo === '\'') || (primer === '`' && ultimo === '`')) {
         return texto;
       }

       return JSON.stringify(texto);
     }

    if (expr.tipo === 'variable') return this.quitarPrefijo(expr.valor || expr.id || '', '$');
    if (expr.tipo === 'id') return this.quitarPrefijo(expr.valor || '', '$');
     if (expr.op) {
       return `(${this.generarExpresion(expr.left)} ${expr.op} ${this.generarExpresion(expr.right)})`;
     }

     return JSON.stringify(expr);
  }
}

export const generadorComponentes = new GeneradorComponentes();
export default GeneradorComponentes;
