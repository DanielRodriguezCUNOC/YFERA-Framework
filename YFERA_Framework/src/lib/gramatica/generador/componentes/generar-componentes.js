/**
 * Generador de código para la gramática de componentes de YFERA.
 * Transforma el AST de componentes en funciones JavaScript que retornan nodos DOM dinámicos.
 */

class GeneradorComponentes {
  constructor() {
    this.componentes = [];
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
  generar(ast) {
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

    if (exportados.length > 0) {
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
        let contentString = nodo.contenido || "";
        let interpContent = this.interpolateDollarVars(contentString);
        codigo += `${indent}${currentVar}.textContent = \`${interpContent}\`\n`;
        
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
        break;

      case 'imagen':
        codigo += `${indent}let ${currentVar} = document.createElement("img");\n`;
        if (nodo.estilos && nodo.estilos.length > 0) {
          codigo += `${indent}${currentVar}.className = "${nodo.estilos.join(' ')}";\n`;
        }
        let src = nodo.fuentes && nodo.fuentes[0] ? nodo.fuentes[0].valor : '';
        let interpSrc = this.interpolateDollarVars(src);
        codigo += `${indent}${currentVar}.src = \`${interpSrc}\`\n`;
        codigo += `${indent}${ctx.currentParent}.appendChild(${currentVar});\n`;
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

      case 'if':
        codigo += `${indent}if (${this.generarExpresion(nodo.condicion)}) {\n`;
        for (const child of nodo.cuerpo) {
          codigo += this.generarElemento(child, ctx, indentSize + 2);
        }
        codigo += `${indent}}\n`;
        if (nodo.else) {
          codigo += `${indent}else {\n`;
          for (const child of nodo.else.cuerpo) {
            codigo += this.generarElemento(child, ctx, indentSize + 2);
          }
          codigo += `${indent}}\n`;
        }
        break;

      default:
        codigo += `${indent}// Nodo desconocido o no implementado: ${nodo.tipo}\n`;
    }

    return codigo;
  }
  
  generarExpresion(expr) {
     if (!expr) return "true";
     if (typeof expr === 'string') return expr;
     if (expr.tipo === 'variable') return expr.id;
     return JSON.stringify(expr);
  }
}

export const generadorComponentes = new GeneradorComponentes();
export default GeneradorComponentes;
