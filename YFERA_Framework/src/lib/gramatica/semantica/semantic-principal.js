/**
 * Analizador semántico para la lógica principal de YFERA.
 */

class AnalizadorSemanticoPrincipal {
  constructor(tablasSimbolosCruzadas = {}) {
    this.errores = [];
    this.tablaSimbolos = []; // [{ nombre, tipo, tipoDato }]
    this.componentesDeclarados = tablasSimbolosCruzadas.componentes || [];
    this.tablasDeclaradas = tablasSimbolosCruzadas.tablas || [];
  }

  agregarError(mensaje, linea = null) {
    this.errores.push({
      tipo: 'Error Semántico (Principal)',
      mensaje,
      linea: linea
    });
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

  validarSentencia(nodo, enBloque) {
    if (!nodo) return;

    switch (nodo.tipo) {
      case 'render':
        this.validarRendereo(nodo.invocacion);
        break;

      case 'if':
      case 'while':
        // Al entrar en un cuerpo de bloque, enBloque = true
        this.validarSentencias(nodo.cuerpo, true);
        if (nodo.else) this.validarSentencias(nodo.else.cuerpo, true);
        break;

      case 'variable_decl':
        if (enBloque) {
          this.agregarError(`Error: No se permiten declaraciones de variables dentro de bloques (${nodo.tipo}). Solo se permiten declaraciones globales.`);
        } else {
          const id = nodo.id;
          if (this.existeEnTabla(id, 'variable')) {
            this.agregarError(`Variable duplicada: ${id}`);
          } else {
            this.registrarEnTabla(id, 'variable', { tipoDato: nodo.tipoDato });
          }
        }
        break;

      case 'for':
        // El for tiene una variable de control, pero el cuerpo no puede tener declaraciones
        this.validarSentencias(nodo.cuerpo, true);
        break;
    }
  }

  validarSentencias(nodos, enBloque) {
    let i = 0;
    while (Array.isArray(nodos) && i < nodos.length) {
      this.validarSentencia(nodos[i], enBloque);
      i += 1;
    }
  }

  validarRendereo(invocacion) {
    const nombre = invocacion.componente;
    if (!this.existeComponente(nombre)) {
      this.agregarError(`Se intenta renderizar un componente no declarado: ${nombre}`);
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