/*
 * Analizador semántico para la base de datos de YFERA.
 */

class AnalizadorSemanticoDB {
  constructor() {
    this.errores = [];
    this.tablaSimbolos = [];
  }

  agregarError(mensaje, linea = null) {
    this.errores.push({
      tipo: 'Error Semántico (DB)',
      mensaje,
      linea: linea
    });
  }

  analizar(ast) {
    this.errores = [];
    this.tablaSimbolos = [];

    if (!Array.isArray(ast)) return { ok: true, errores: [], tablaSimbolos: [] };

    // Registrar tablas
    this.recolectarTablas(ast);

    // Validar operaciones (insert, update, delete)
    this.validarOperaciones(ast);

    return {
      ok: this.errores.length === 0,
      errores: this.errores,
      tablaSimbolos: this.tablaSimbolos.slice()
    };
  }

  recolectarTablas(ast) {
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo && nodo.tipo === 'create_table') {
        const nombre = nodo.tabla;
        if (this.existeTabla(nombre)) {
          this.agregarError(`La tabla '${nombre}' ya está definida.`);
        } else {
          this.registrarTabla(nombre, nodo.columnas);
        }
      }
      i += 1;
    }
  }

  validarOperaciones(ast) {
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (!nodo) {
        i += 1;
        continue;
      }

      if (nodo.tipo === 'insert' || nodo.tipo === 'update') {
        this.validarEscritura(nodo);
      } else if (nodo.tipo === 'delete' || nodo.tipo === 'select_column') {
        if (!this.existeTabla(nodo.tabla)) {
          this.agregarError(`La tabla '${nodo.tabla}' no existe.`);
        }
      }
      i += 1;
    }
  }

  validarEscritura(nodo) {
    const tabla = this.obtenerTabla(nodo.tabla);
    if (!tabla) {
      this.agregarError(`La tabla '${nodo.tabla}' no existe.`);
      return;
    }

    const valores = nodo.valores || [];
    let i = 0;
    while (i < valores.length) {
      const v = valores[i];
      const col = this.obtenerColumna(tabla, v.columna);

      if (!col) {
        this.agregarError(`La columna '${v.columna}' no existe en la tabla '${nodo.tabla}'.`);
      } else {
        // Validación de tipos primitiva
        const tipoValor = typeof v.valor;
        if (col.tipo === 'int' && tipoValor !== 'number') {
          this.agregarError(`Tipo incorrecto para '${v.columna}': se esperaba int.`);
        } else if (col.tipo === 'string' && tipoValor !== 'string') {
          this.agregarError(`Tipo incorrecto para '${v.columna}': se esperaba string.`);
        }
      }
      i += 1;
    }
  }

  // --- MÉTODOS DE TABLA DE SÍMBOLOS PRIMITIVA ---

  registrarTabla(nombre, columnas) {
    this.tablaSimbolos.push({
      nombre: nombre,
      tipo: 'tabla',
      columnas: columnas
    });
  }

  existeTabla(nombre) {
    let idx = 0;
    while (idx < this.tablaSimbolos.length) {
      if (this.tablaSimbolos[idx].nombre === nombre) return true;
      idx += 1;
    }
    return false;
  }

  obtenerTabla(nombre) {
    let idx = 0;
    while (idx < this.tablaSimbolos.length) {
      if (this.tablaSimbolos[idx].nombre === nombre) return this.tablaSimbolos[idx];
      idx += 1;
    }
    return null;
  }

  obtenerColumna(tabla, nombreCol) {
    const columnas = tabla.columnas;
    let idx = 0;
    while (idx < columnas.length) {
      if (columnas[idx].nombre === nombreCol) return columnas[idx];
      idx += 1;
    }
    return null;
  }
}

export function analizarDB(ast) {
  const analizador = new AnalizadorSemanticoDB();
  return analizador.analizar(ast);
}

export default AnalizadorSemanticoDB;
