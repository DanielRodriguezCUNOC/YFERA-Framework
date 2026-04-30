/*
 * Analizador semántico para la lógica principal de YFERA.
 * Valida variables, control de flujo y llamadas a componentes.
 */

class AnalizadorSemanticoPrincipal {
  constructor(tablasSimbolosCruzadas = {}) {
    this.errores = [];
    this.tablaSimbolos = []; // [{ nombre, tipo: 'variable', ambito, tipoDato }]
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
        this.validarSentencia(nodo, 'global');
      }
      i += 1;
    }

    return {
      ok: this.errores.length === 0,
      errores: this.errores,
      tablaSimbolos: this.tablaSimbolos.slice()
    };
  }

  validarSentencia(nodo, ambito) {
    switch (nodo.tipo) {
      case 'render':
        this.validarRendereo(nodo.invocacion, ambito);
        break;

      case 'if':
      case 'while':
        this.validarSentencias(nodo.cuerpo, ambito);
        if (nodo.else) this.validarSentencias(nodo.else.cuerpo, ambito);
        break;

      case 'insert_db':
      case 'delete_db':
        break;

      default:
        break;
    }
  }

  validarSentencias(nodos, ambito) {
    let i = 0;
    while (Array.isArray(nodos) && i < nodos.length) {
      this.validarSentencia(nodos[i], ambito);
      i += 1;
    }
  }

  validarRendereo(invocacion, ambito) {
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

  existeEnTabla(nombre, tipo, ambito) {
    let idx = 0;
    while (idx < this.tablaSimbolos.length) {
      const entrada = this.tablaSimbolos[idx];
      if (entrada.nombre === nombre && entrada.tipo === tipo && entrada.ambito === ambito) {
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