/**
 * Analizador semántico para la lógica principal de YFERA.
 */

import { formatearError, extraerUbicacion } from './semantic-errors.js';

class AnalizadorSemanticoPrincipal {
  constructor(tablasSimbolosCruzadas = {}) {
    this.errores = [];
    this.tablaSimbolos = []; // [{ nombre, tipo, tipoDato }]
    this.componentesDeclarados = tablasSimbolosCruzadas.componentes || [];
    this.tablasDeclaradas = tablasSimbolosCruzadas.tablas || [];
  }

  agregarError(mensaje, linea = null, columna = null, contexto = null) {
    if (linea && typeof linea === 'object') {
      const loc = extraerUbicacion(linea);
      linea = loc.linea;
      columna = columna || loc.columna;
      contexto = contexto || loc.contexto;
    }

    this.errores.push(formatearError(mensaje, { tipo: 'Error Semántico (Principal)', linea, columna, contexto }));
  }

  analizar(ast) {
    this.errores = [];
    this.tablaSimbolos = [];

    if (!Array.isArray(ast)) return { ok: true, errores: [], tablaSimbolos: [] };

    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo) {
        this.validarSentencia(nodo, false);
      }
      i += 1;
    }

    return {
      ok: this.errores.length === 0,
      errores: this.errores,
      tablaSimbolos: this.tablaSimbolos.slice()
    };
  }

  validarSentencia(nodo, enBloque, nivelAnidacion = 0) {
    if (!nodo) return;

    switch (nodo.tipo) {
      case 'render':
        this.validarRendereo(nodo.invocacion);
        break;

      case 'if':
      case 'while':
        this.validarExpresion(nodo.condicion);
        this.validarSentencias(nodo.cuerpo, true, nivelAnidacion + 1);
        if (nodo.else) {
          this.validarSentencias(nodo.else.cuerpo, true, nivelAnidacion + 1);
        }
        break;

      case 'variable_decl':
        if (enBloque) {
          this.agregarError(`Error: No se permiten declaraciones de variables dentro de bloques (${nodo.tipo}). Solo se permiten declaraciones globales.`, nodo);
        } else {
          const id = nodo.id;
          if (this.existeEnTabla(id, 'variable')) {
            this.agregarError(`Variable duplicada: ${id}`, nodo);
          } else {
            this.registrarEnTabla(id, 'variable', { tipoDato: nodo.tipoDato });
          }
        }
        break;

      case 'for':
        this.validarSentencias(nodo.cuerpo, true, nivelAnidacion + 1);
        break;
    }
  }

  validarSentencias(nodos, enBloque, nivelAnidacion = 0) {
    let i = 0;
    while (Array.isArray(nodos) && i < nodos.length) {
      this.validarSentencia(nodos[i], enBloque, nivelAnidacion);
      i += 1;
    }
  }

  validarRendereo(invocacion) {
    const nombre = invocacion.componente;
    if (!this.existeComponente(nombre)) {
      this.agregarError(`Se intenta renderizar un componente no declarado: ${nombre}`, invocacion);
    }
  }

  existeComponente(nombre) {
    let idx = 0;
    while (idx < this.componentesDeclarados.length) {
      if (this.componentesDeclarados[idx].nombre === nombre) return true;
      idx += 1;
    }
    return false;
  }

  validarExpresion(exp) {
    if (!exp) return;
    if (exp.tipo === 'variable') {
      const nombreVar = exp.valor ? exp.valor.toString().replace('$', '') : '';
      if (nombreVar && !this.existeEnTabla(nombreVar, 'variable')) {
        this.agregarError(`Variable no declarada: ${nombreVar}`, exp);
      }
    } else if (exp.op && (exp.left || exp.right)) {
      this.validarExpresion(exp.left);
      this.validarExpresion(exp.right);
    }
  }

  registrarEnTabla(nombre, tipo, info = {}) {
    this.tablaSimbolos.push({
      nombre: nombre,
      tipo: tipo,
      ...info
    });
  }

  existeEnTabla(nombre, tipo) {
    let idx = 0;
    while (idx < this.tablaSimbolos.length) {
      const entrada = this.tablaSimbolos[idx];
      if (entrada.nombre === nombre && entrada.tipo === tipo) {
        return true;
      }
      idx += 1;
    }
    return false;
  }
}

export function analizarPrincipal(ast, tablasCruzadas) {
  const analizador = new AnalizadorSemanticoPrincipal(tablasCruzadas);
  return analizador.analizar(ast);
}

export default AnalizadorSemanticoPrincipal;