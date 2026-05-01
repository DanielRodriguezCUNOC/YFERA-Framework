/**
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

  analizar(ast) {
    this.errores = [];
    this.tablaSimbolos = [];

    if (!Array.isArray(ast)) {
      this.agregarError('AST de componentes inválido');
      return { ok: false, errores: this.errores, tablaSimbolos: [] };
    }

    // Recolectar componentes 
    this.recolectarComponentes(ast);

    // Validar cuerpos
    this.validarCuerpos(ast);

    return {
      ok: this.errores.length === 0,
      errores: this.errores,
      tablaSimbolos: this.tablaSimbolos.slice()
    };
  }

  recolectarComponentes(ast) {
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo.tipo === 'componente') {
        const nombre = nodo.nombre;
        if (this.existeEnTabla(nombre, 'componente')) {
          this.agregarError(`Componente duplicado: ${nombre}`);
        } else {
          this.registrarEnTabla(nombre, 'componente', {
            parametros: nodo.parametros || []
          });
        }
      }
      i += 1;
    }
  }

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
    let p = 0;
    const params = comp.parametros || [];
    while (p < params.length) {
      const param = params[p];
      if (!this.existeEnTabla(param.id, 'variable')) {
        this.registrarEnTabla(param.id, 'variable', { tipoDato: param.tipo });
      }
      p += 1;
    }

    this.validarElementos(comp.elementos);
  }

  validarElementos(elementos) {
    let e = 0;
    while (e < elementos.length) {
      const el = elementos[e];
      this.validarElemento(el);
      e += 1;
    }
  }

  validarElemento(nodo) {
    if (!nodo) return;

    switch (nodo.tipo) {
      case 'seccion':
        this.validarElementos(nodo.elementos);
        break;

      case 'if':
        this.validarExpresion(nodo.condicion);
        this.validarElementos(nodo.cuerpo);
        if (nodo.else) {
          this.validarElementos(nodo.else.cuerpo);
        }
        break;

      case 'for':
        const idVar = nodo.variable;
        if (!this.existeEnTabla(idVar, 'variable')) {
          this.registrarEnTabla(idVar, 'variable', { tipoDato: 'int' });
        }
        this.validarExpresion(nodo.desde);
        this.validarExpresion(nodo.hasta);
        this.validarElementos(nodo.cuerpo);
        break;

      case 'declaracion':
      case 'variable_decl':
        this.agregarError(`Error: No se permiten declaraciones de variables dentro de componentes. Solo se permiten variables globales, gracias por su compresion :).`);
        break;
    }
  }

  validarExpresion(exp) {
    if (!exp) return;

    if (exp.tipo === 'variable') {
      const nombreVar = exp.valor.replace('$', '');
      if (!this.existeEnTabla(nombreVar, 'variable')) {
        this.agregarError(`Variable no declarada: ${nombreVar} aqui no hacemos esto :v`);
      }
    } else if (exp.op) {
      this.validarExpresion(exp.left);
      this.validarExpresion(exp.right);
    }
  }

  // --- TABLA DE SÍMBOLOS PRIMITIVA ---

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

export function analizarComponentes(ast) {
  const analizador = new AnalizadorSemanticoComponentes();
  return analizador.analizar(ast);
}

export default AnalizadorSemanticoComponentes;