/*
 * Generador de código para la base de datos de YFERA.
 * Traduce operaciones de DB a una capa de persistencia en JavaScript
 */

class GeneradorDB {
  constructor() {
    this.tablas = {};
  }

  generar(ast) {
    if (!Array.isArray(ast)) return '';

    let codigo = '// Capa de persistencia YFERA_DB\n';
    codigo += 'const YFERA_DB = {\n';
    codigo += '  tablas: {},\n';
    codigo += '  initTable(nombre, cols) { if(!this.tablas[nombre]) this.tablas[nombre] = []; },\n';
    codigo += '  insert(nombre, valores) { this.initTable(nombre); this.tablas[nombre].push(valores); },\n';
    codigo += '  delete(nombre, id) { if(this.tablas[nombre]) this.tablas[nombre].splice(id, 1); },\n';
    codigo += '  select(nombre, columna, fila) { return this.tablas[nombre] && this.tablas[nombre][fila] ? this.tablas[nombre][fila][columna] : null; }\n';
    codigo += '};\n\n';

    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo) {
        codigo += this.generarSentencia(nodo) + '\n';
      }
      i += 1;
    }

    return codigo;
  }

  generarSentencia(nodo) {
    switch (nodo.tipo) {
      case 'create_table':
        return `YFERA_DB.initTable("${nodo.tabla}");`;

      case 'insert':
        const valoresObj = {};
        for (const v of nodo.valores) valoresObj[v.columna] = v.valor;
        return `YFERA_DB.insert("${nodo.tabla}", ${JSON.stringify(valoresObj)});`;

      case 'delete':
        return `YFERA_DB.delete("${nodo.tabla}", ${nodo.id});`;

      default:
        return `// Operación DB no soportada: ${nodo.tipo}`;
    }
  }
}

export const generadorDB = new GeneradorDB();
export default GeneradorDB;
