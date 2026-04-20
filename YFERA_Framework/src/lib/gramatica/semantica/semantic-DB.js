/*
* Analizador semántico para la gramática DB
*/

class AnalizadorSemanticoDB {
  constructor() {
    this.errores = [];
    this.tablas = {}; 
    this.tiposValidos = {
      int: true,
      float: true,
      string: true,
      boolean: true,
      char: true
    };
  }

  agregarError(mensaje, extra = {}) {
    this.errores.push({
      tipo: 'Error Semántico',
      mensaje,
      linea: null,
      columna: null,
      ...extra
    });
  }

  analizar(ast) {
    this.errores = [];
    this.tablas = {};

    if (!Array.isArray(ast)) {
      this.agregarError('El AST de DB debe ser un arreglo de sentencias');
      return { ok: false, errores: this.errores };
    }

    for (let i = 0; i < ast.length; i++) {
      const sentencia = ast[i];
      this.validarSentencia(sentencia);
    }

    return {
      ok: this.errores.length === 0,
      errores: this.errores
    };
  }

  validarSentencia(sentencia) {
    if (!sentencia || typeof sentencia !== 'object' || typeof sentencia.tipo !== 'string') {
      this.agregarError('Sentencia DB inválida');
      return;
    }

    switch (sentencia.tipo) {
      case 'create_table':
        this.validarCreateTable(sentencia);
        break;
      case 'select_column':
        this.validarSelectColumn(sentencia);
        break;
      case 'insert':
        this.validarInsert(sentencia);
        break;
      case 'update':
        this.validarUpdate(sentencia);
        break;
      case 'delete':
        this.validarDelete(sentencia);
        break;
      default:
        this.agregarError(`Tipo de sentencia DB no soportado: ${sentencia.tipo}`);
        break;
    }
  }

  validarCreateTable(nodo) {
    const nombreTabla = nodo.tabla;

    if (!this.esIdentificadorValido(nombreTabla)) {
      this.agregarError(`Nombre de tabla inválido: ${String(nombreTabla)}`);
      return;
    }

    if (this.tablas[nombreTabla]) {
      this.agregarError(`La tabla ya fue declarada: ${nombreTabla}`);
      return;
    }

    if (!Array.isArray(nodo.columnas) || nodo.columnas.length === 0) {
      this.agregarError(`La tabla "${nombreTabla}" debe tener al menos una columna`);
      return;
    }

    const columnas = {};
    for (let i = 0; i < nodo.columnas.length; i++) {
      const c = nodo.columnas[i];
      const nombreCol = c && c.nombre;
      const tipoCol = c && c.tipo;

      if (!this.esIdentificadorValido(nombreCol)) {
        this.agregarError(`Nombre de columna inválido en tabla "${nombreTabla}": ${String(nombreCol)}`);
        continue;
      }

      if (columnas[nombreCol]) {
        this.agregarError(`Columna duplicada "${nombreCol}" en tabla "${nombreTabla}"`);
        continue;
      }

      if (!this.tiposValidos[tipoCol]) {
        this.agregarError(`Tipo no válido para columna "${nombreCol}" en "${nombreTabla}": ${String(tipoCol)}`);
        continue;
      }

      columnas[nombreCol] = tipoCol;
    }

    this.tablas[nombreTabla] = { columnas };
  }

  validarSelectColumn(nodo) {
    const tabla = nodo.tabla;
    const columna = nodo.columna;

    if (!this.tablas[tabla]) {
      this.agregarError(`La tabla no existe en SELECT: ${String(tabla)}`);
      return;
    }

    if (!this.tablas[tabla].columnas[columna]) {
      this.agregarError(`La columna "${String(columna)}" no existe en tabla "${tabla}"`);
    }
  }

  validarInsert(nodo) {
    const tabla = nodo.tabla;

    if (!this.tablas[tabla]) {
      this.agregarError(`La tabla no existe en INSERT: ${String(tabla)}`);
      return;
    }

    if (!Array.isArray(nodo.valores) || nodo.valores.length === 0) {
      this.agregarError(`INSERT sin asignaciones en tabla "${tabla}"`);
      return;
    }

    const asignadas = {};
    const esquema = this.tablas[tabla].columnas;

    for (let i = 0; i < nodo.valores.length; i++) {
      const a = nodo.valores[i];
      const columna = a && a.columna;
      const valor = a && a.valor;

      if (!this.esIdentificadorValido(columna)) {
        this.agregarError(`Columna inválida en INSERT de "${tabla}": ${String(columna)}`);
        continue;
      }

      if (asignadas[columna]) {
        this.agregarError(`Columna repetida en INSERT de "${tabla}": ${columna}`);
        continue;
      }
      asignadas[columna] = true;

      if (!esquema[columna]) {
        this.agregarError(`La columna "${columna}" no existe en tabla "${tabla}"`);
        continue;
      }

      const tipoEsperado = esquema[columna];
      if (!this.esValorCompatible(tipoEsperado, valor)) {
        this.agregarError(
          `Tipo incompatible en INSERT (${tabla}.${columna}): esperado ${tipoEsperado}, recibido ${this.obtenerTipoValor(valor)}`
        );
      }
    }
  }

  validarUpdate(nodo) {
    const tabla = nodo.tabla;

    if (!this.tablas[tabla]) {
      this.agregarError(`La tabla no existe en UPDATE: ${String(tabla)}`);
      return;
    }

    if (!Number.isInteger(nodo.id) || nodo.id < 0) {
      this.agregarError(`Id inválido en UPDATE de "${tabla}": ${String(nodo.id)}`);
    }

    if (!Array.isArray(nodo.valores) || nodo.valores.length === 0) {
      this.agregarError(`UPDATE sin asignaciones en tabla "${tabla}"`);
      return;
    }

    const asignadas = {};
    const esquema = this.tablas[tabla].columnas;

    for (let i = 0; i < nodo.valores.length; i++) {
      const a = nodo.valores[i];
      const columna = a && a.columna;
      const valor = a && a.valor;

      if (!this.esIdentificadorValido(columna)) {
        this.agregarError(`Columna inválida en UPDATE de "${tabla}": ${String(columna)}`);
        continue;
      }

      if (asignadas[columna]) {
        this.agregarError(`Columna repetida en UPDATE de "${tabla}": ${columna}`);
        continue;
      }
      asignadas[columna] = true;

      if (!esquema[columna]) {
        this.agregarError(`La columna "${columna}" no existe en tabla "${tabla}"`);
        continue;
      }

      const tipoEsperado = esquema[columna];
      if (!this.esValorCompatible(tipoEsperado, valor)) {
        this.agregarError(
          `Tipo incompatible en UPDATE (${tabla}.${columna}): esperado ${tipoEsperado}, recibido ${this.obtenerTipoValor(valor)}`
        );
      }
    }
  }

  validarDelete(nodo) {
    const tabla = nodo.tabla;

    if (!this.tablas[tabla]) {
      this.agregarError(`La tabla no existe en DELETE: ${String(tabla)}`);
      return;
    }

    if (!Number.isInteger(nodo.id) || nodo.id < 0) {
      this.agregarError(`Id inválido en DELETE de "${tabla}": ${String(nodo.id)}`);
    }
  }

  esValorCompatible(tipoEsperado, valor) {
    if (tipoEsperado === 'int') {
      return typeof valor === 'number' && Number.isInteger(valor);
    }

    if (tipoEsperado === 'float') {
      return typeof valor === 'number' && Number.isFinite(valor);
    }

    if (tipoEsperado === 'boolean') {
      return typeof valor === 'boolean';
    }

    if (tipoEsperado === 'char') {
      if (typeof valor !== 'string') return false;
      // Compatible con lexer que entrega "'a'" o parser que entregue "a"
      if (valor.length === 1) return true;
      if (valor.length === 3 && valor.charAt(0) === '\'' && valor.charAt(2) === '\'') return true;
      return false;
    }

    if (tipoEsperado === 'string') {
      return typeof valor === 'string';
    }

    return false;
  }

  obtenerTipoValor(valor) {
    if (typeof valor === 'number') {
      if (Number.isInteger(valor)) return 'int';
      return 'float';
    }
    if (typeof valor === 'boolean') return 'boolean';
    if (typeof valor === 'string') {
      if (valor.length === 1 || (valor.length === 3 && valor.charAt(0) === '\'' && valor.charAt(2) === '\'')) {
        return 'char/string';
      }
      return 'string';
    }
    return typeof valor;
  }

  esIdentificadorValido(id) {
    if (typeof id !== 'string' || id.length === 0) return false;

    const c0 = id.charAt(0);
    if (!this.esLetra(c0) && c0 !== '_') return false;

    for (let i = 1; i < id.length; i++) {
      const c = id.charAt(i);
      if (!this.esLetra(c) && !this.esDigito(c) && c !== '_') return false;
    }
    return true;
  }

  esLetra(c) {
    const code = c.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  }

  esDigito(c) {
    const code = c.charCodeAt(0);
    return code >= 48 && code <= 57;
  }
}

export function analizarDB(ast) {
  const analizador = new AnalizadorSemanticoDB();
  return analizador.analizar(ast);
}

export { AnalizadorSemanticoDB };
export default analizarDB;