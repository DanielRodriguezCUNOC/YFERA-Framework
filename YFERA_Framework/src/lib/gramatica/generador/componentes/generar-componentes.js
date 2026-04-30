/**
 * Generador de código para la gramática de componentes de YFERA.
 * Transforma el AST de componentes en funciones JavaScript que retornan HTML.
 */

class GeneradorComponentes {
  constructor() {
    this.componentes = [];
  }

  /**
   * Genera el código JS para un conjunto de componentes.
   * @param {Array} ast - El AST generado por grammar-components.
   */
  generar(ast) {
    if (!Array.isArray(ast)) return '';

    let codigo = '// Componentes autogenerados por YFERA\n\n';

    for (const nodo of ast) {
      if (nodo.tipo === 'componente') {
        codigo += this.generarComponente(nodo) + '\n\n';
      }
    }

    return codigo;
  }

  generarComponente(nodo) {
    const { nombre, parametros, elementos } = nodo;

    const nombreComp = nombre || 'ComponenteAnonimo';
    const paramsStr = (parametros || []).map(p => p.id).join(', ');

    let cuerpo = `function ${nombreComp}(${paramsStr}) {\n`;
    cuerpo += `  let __html = '';\n`;

    for (const elem of elementos) {
      cuerpo += this.generarElemento(elem, 2);
    }

    cuerpo += `  return __html;\n`;
    cuerpo += `}`;

    return cuerpo;
  }

  generarElemento(nodo, indentSize = 2) {
    const indent = ' '.repeat(indentSize);
    let codigo = '';

    switch (nodo.tipo) {
      case 'seccion':
        const clases = (nodo.estilos || []).join(' ');
        codigo += `${indent}__html += \`<div class="${clases}">\`;\n`;
        for (const child of nodo.elementos) {
          codigo += this.generarElemento(child, indentSize + 2);
        }
        codigo += `${indent}__html += \`</div>\`;\n`;
        break;

      case 'texto':
        const clasesTexto = (nodo.estilos || []).join(' ');
        codigo += `${indent}__html += \`<span class="${clasesTexto}">${nodo.contenido}</span>\`;\n`;
        break;

      case 'imagen':
        const clasesImg = (nodo.estilos || []).join(' ');
        const src = nodo.fuentes && nodo.fuentes[0] ? nodo.fuentes[0].valor : '';
        codigo += `${indent}__html += \`<img src="${src}" class="${clasesImg}" />\`;\n`;
        break;

      case 'tabla':
        const clasesTab = (nodo.estilos || []).join(' ');
        codigo += `${indent}__html += \`<table class="${clasesTab}">\`;\n`;
        for (const fila of nodo.filas) {
          codigo += `${indent}  __html += '<tr>';\n`;
          for (const celda of fila.celdas) {
            codigo += `${indent}    __html += '<td>';\n`;
            for (const child of celda.elementos) {
              codigo += this.generarElemento(child, indentSize + 6);
            }
            codigo += `${indent}    __html += '</td>';\n`;
          }
          codigo += `${indent}  __html += '</tr>';\n`;
        }
        codigo += `${indent}__html += '</table>';\n`;
        break;

      case 'formulario':
        const clasesForm = (nodo.estilos || []).join(' ');
        codigo += `${indent}__html += \`<form class="${clasesForm}">\`;\n`;
        for (const input of nodo.elementos) {
          codigo += this.generarElemento(input, indentSize + 2);
        }
        if (nodo.submit) {
          codigo += this.generarElemento(nodo.submit, indentSize + 2);
        }
        codigo += `${indent}__html += '</form>';\n`;
        break;

      case 'input_text':
      case 'input_number':
      case 'input_bool':
        const type = nodo.tipo === 'input_text' ? 'text' : nodo.tipo === 'input_number' ? 'number' : 'checkbox';
        const config = nodo.config || { propiedades: [] };
        const idProp = config.propiedades.find(p => p.propiedad === 'id');
        const labelProp = config.propiedades.find(p => p.propiedad === 'label');
        const id = idProp ? idProp.valor : '';
        const label = labelProp ? labelProp.valor : '';
        codigo += `${indent}__html += \`<label>${label}</label><input type="${type}" id="${id}" />\`;\n`;
        break;

      case 'if':
        codigo += `${indent}if (${this.generarExpresion(nodo.condicion)}) {\n`;
        for (const child of nodo.cuerpo) {
          codigo += this.generarElemento(child, indentSize + 2);
        }
        codigo += `${indent}}\n`;
        if (nodo.else) {
          codigo += `${indent}else {\n`;
          for (const child of nodo.else.cuerpo) {
            codigo += this.generarElemento(child, indentSize + 2);
          }
          codigo += `${indent}}\n`;
        }
        break;

      default:
        codigo += `${indent}// Nodo desconocido o no implementado: ${nodo.tipo}\n`;
    }

    return codigo;
  }
}

export const generadorComponentes = new GeneradorComponentes();
export default GeneradorComponentes;
