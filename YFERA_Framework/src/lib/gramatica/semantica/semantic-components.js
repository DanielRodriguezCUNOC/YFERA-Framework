/*
* Analizador semántico para los componentes de YFERA.
 */

class AnalizadorSemanticoComponentes {
  constructor() {
    this.errores = [];
    this.tablaSimbolos = [];
  }

  agregarError(mensaje, linea = null) {
    this.errores.push({
      tipo: 'Error Semántico',
      mensaje,
      linea: linea
    });
  }

  /**
   * Punto de entrada para el análisis semántico.
   * @param {Array} ast - AST de componentes.
   */
  analizar(ast) {
    this.errores = [];
    this.tablaSimbolos = [];

    if (!Array.isArray(ast)) {
      this.agregarError('AST de componentes inválido');
      return { ok: false, errores: this.errores, tablaSimbolos: [] };
    }

    // Recolectar nombres de componentes
    this.recolectarComponentes(ast);

    // Validar cuerpos de componentes
    this.validarCuerpos(ast);

    return {
      ok: this.errores.length === 0,
      errores: this.errores,
      tablaSimbolos: this.tablaSimbolos.slice()
    };
  }

  /**
   * Registra los componentes en la tabla de símbolos.
   */
  recolectarComponentes(ast) {
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo.tipo === 'componente') {
        const nombre = nodo.nombre;

        if (this.existeEnTabla(nombre, 'componente', 'global')) {
          this.agregarError(`Componente duplicado: ${nombre}`);
        } else {
          this.registrarEnTabla(nombre, 'componente', 'global', {
            parametros: nodo.parametros || []
          });
        }
      }
      i += 1;
    }
  }

  /**
   * Valida el uso de variables y tipos dentro de los componentes.
   */
  validarCuerpos(ast) {
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo.tipo === 'componente') {
        this.analizarComponente(nodo);
      }
      i += 1;
    }
  }

  analizarComponente(comp) {
    const ambito = comp.nombre;

    // Registrar parámetros en el ámbito del componente
    let p = 0;
    const params = comp.parametros || [];
    while (p < params.length) {
      const param = params[p]; // { tipo, id }
      this.registrarEnTabla(param.id, 'variable', ambito, { tipoDato: param.tipo });
      p += 1;
    }

    // Validar elementos interiores
    this.validarElementos(comp.elementos, ambito);
  }

  validarElementos(elementos, ambito) {
    let e = 0;
    while (e < elementos.length) {
      const el = elementos[e];
      this.validarElemento(el, ambito);
      e += 1;
    }
  }

  validarElemento(nodo, ambito) {
    if (!nodo) return;

    switch (nodo.tipo) {
      case 'seccion':
        this.validarElementos(nodo.elementos, ambito);
        break;

      case 'texto':
        // Si el texto usa una variable (ej: text(variable)), validar que exista
        break;

      case 'if':
        this.validarExpresion(nodo.condicion, ambito);
        this.validarElementos(nodo.cuerpo, ambito);
        if (nodo.else) {
          this.validarElementos(nodo.else.cuerpo, ambito);
        }
        break;

      case 'for':
        // El for declara una variable local
        const idVar = nodo.variable;
        this.registrarEnTabla(idVar, 'variable', `for_${idVar}`, { tipoDato: 'int' });
        this.validarExpresion(nodo.desde, ambito);
        this.validarExpresion(nodo.hasta, ambito);
        this.validarElementos(nodo.cuerpo, `for_${idVar}`);
        break;
    }
  }

  validarExpresion(exp, ambito) {
    if (!exp) return;

    if (exp.tipo === 'variable') {
      const nombreVar = exp.valor.replace('$', '');
      if (!this.buscarVariable(nombreVar, ambito)) {
        this.agregarError(`Variable no declarada: ${nombreVar} en ámbito ${ambito}`);
      }
    } else if (exp.op) {
      this.validarExpresion(exp.left, ambito);
      this.validarExpresion(exp.right, ambito);
    }
  }

  /**
   * Busca una variable subiendo por los ámbitos.
   */
  buscarVariable(nombre, ambitoActual) {
    // Buscar en el ámbito actual
    if (this.existeEnTabla(nombre, 'variable', ambitoActual)) return true;

    // Buscar en el ámbito global (si aplica)
    if (this.existeEnTabla(nombre, 'variable', 'global')) return true;

    return false;
  }

  // --- MÉTODOS DE TABLA DE SÍMBOLOS PRIMITIVA ---

  registrarEnTabla(nombre, tipo, ambito, info = {}) {
    this.tablaSimbolos.push({
      nombre: nombre,
      tipo: tipo,
      ambito: ambito,
      ...info
    });
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

  obtenerEntrada(nombre, tipo, ambito) {
    let idx = 0;
    while (idx < this.tablaSimbolos.length) {
      const entrada = this.tablaSimbolos[idx];
      if (entrada.nombre === nombre && entrada.tipo === tipo && entrada.ambito === ambito) {
        return entrada;
      }
      idx += 1;
    }
    return null;
  }
}

export function analizarComponentes(ast) {
  const analizador = new AnalizadorSemanticoComponentes();
  return analizador.analizar(ast);
}

export default AnalizadorSemanticoComponentes;