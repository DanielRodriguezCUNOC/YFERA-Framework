/*
* Analizador semántico para la gramática principal
*/

class AnalizadorSemanticoPrincipal {
  constructor() {
    this.errores = [];
    this.variables = {}; 
    this.funciones = {}; 
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
    this.variables = {};
    this.funciones = {};

    if (!ast || typeof ast !== 'object') {
      this.agregarError('El AST principal es inválido');
      return { ok: false, errores: this.errores };
    }

    // Recolectar funciones
    this.recolectarFunciones(ast.funciones);

    // Validar imports
    this.validarImports(ast.imports);

    // Validar declaraciones globales
    this.validarDeclaraciones(ast.declaraciones);

    // Validar main
    this.validarMain(ast.main);

    return {
      ok: this.errores.length === 0,
      errores: this.errores
    };
  }

  recolectarFunciones(funciones) {
    if (!Array.isArray(funciones)) return;

    for (let i = 0; i < funciones.length; i++) {
      const f = funciones[i];
      if (!f || typeof f !== 'object') continue;

      const nombre = f.nombre;
      if (!this.esIdentificadorValido(nombre)) {
        this.agregarError(`Nombre de función inválido: ${String(nombre)}`);
        continue;
      }

      if (this.funciones[nombre]) {
        this.agregarError(`Función duplicada: ${nombre}`);
        continue;
      }

      const parametros = Array.isArray(f.parametros)
        ? f.parametros.map(p => ({ nombre: p.id, tipo: p.tipo }))
        : [];

      this.funciones[nombre] = {
        parametros,
        hasReturn: false
      };
    }
  }

  validarImports(imports) {
    if (!Array.isArray(imports)) return;

    const importados = {};
    for (let i = 0; i < imports.length; i++) {
      const imp = imports[i];
      if (!imp || typeof imp.ruta !== 'string') {
        this.agregarError('Import inválido');
        continue;
      }

      const ruta = imp.ruta;
      if (importados[ruta]) {
        this.agregarError(`Import duplicado: ${ruta}`);
      } else {
        importados[ruta] = true;
      }
    }
  }

  validarDeclaraciones(declaraciones) {
    if (!Array.isArray(declaraciones)) return;

    for (let i = 0; i < declaraciones.length; i++) {
      this.validarDeclaracion(declaraciones[i]);
    }
  }

  validarDeclaracion(decl) {
    if (!decl || typeof decl !== 'object') {
      this.agregarError('Declaración inválida');
      return;
    }

    const tipo = decl.tipo;
    const tipoDato = decl.dato;
    const id = decl.id;

    if (!this.tiposValidos[tipoDato]) {
      this.agregarError(`Tipo de dato no válido: ${String(tipoDato)}`);
      return;
    }

    if (!this.esIdentificadorValido(id)) {
      this.agregarError(`Identificador inválido en declaración: ${String(id)}`);
      return;
    }

    if (this.variables[id]) {
      this.agregarError(`Variable duplicada: ${id}`);
      return;
    }

    if (tipo === 'declaracion') {
      if (decl.valor !== undefined && decl.valor !== null) {
        this.validarValorCompatible(tipoDato, decl.valor, `declaración de ${id}`);
      }
      this.variables[id] = tipoDato;
    }

    if (tipo === 'arreglo_tamanio') {
      if (!decl.valor || typeof decl.valor.size !== 'number' || decl.valor.size <= 0) {
        this.agregarError(`Tamaño de arreglo inválido para "${id}"`);
      }
      this.variables[id] = `${tipoDato}[]`;
    }

    if (tipo === 'arreglo_literal') {
      if (!Array.isArray(decl.valor) || decl.valor.length === 0) {
        this.agregarError(`Arreglo literal vacío para "${id}"`);
      } else {
        for (let i = 0; i < decl.valor.length; i++) {
          this.validarValorCompatible(tipoDato, decl.valor[i], `elemento [${i}] de arreglo ${id}`);
        }
      }
      this.variables[id] = `${tipoDato}[]`;
    }

    if (tipo === 'arreglo_execute') {
      if (typeof decl.consulta !== 'string' || decl.consulta.length === 0) {
        this.agregarError(`Consulta DB inválida para arreglo "${id}"`);
      }
      this.variables[id] = `${tipoDato}[]`;
    }
  }

  validarMain(main) {
    if (!main || main.tipo !== 'main') {
      this.agregarError('Bloque main inválido o no encontrado');
      return;
    }

    if (!Array.isArray(main.sentencias)) {
      this.agregarError('Sentencias de main inválidas');
      return;
    }

    const ambitoMain = { ...this.variables };
    for (let i = 0; i < main.sentencias.length; i++) {
      this.validarSentenciaMain(main.sentencias[i], ambitoMain);
    }
  }

  validarSentenciaMain(sent, ambito) {
    if (!sent || typeof sent !== 'object') {
      this.agregarError('Sentencia main inválida');
      return;
    }

    const tipo = sent.tipo;

    if (tipo === 'invocacion') {
      this.validarInvocacion(sent, ambito);
      return;
    }

    if (tipo === 'asignacion') {
      this.validarAsignacion(sent, ambito);
      return;
    }

    if (tipo === 'while') {
      this.validarWhile(sent, ambito);
      return;
    }

    if (tipo === 'for') {
      this.validarFor(sent, ambito);
      return;
    }

    if (tipo === 'if') {
      this.validarIf(sent, ambito);
      return;
    }

    this.agregarError(`Tipo de sentencia main no soportado: ${tipo}`);
  }

  validarInvocacion(nodo, ambito) {
    const componente = nodo.componente;

    if (!this.esIdentificadorValido(componente)) {
      this.agregarError(`Nombre de componente inválido: ${String(componente)}`);
      return;
    }

    // validamos argumentos
    if (Array.isArray(nodo.args)) {
      for (let i = 0; i < nodo.args.length; i++) {
        this.validarExpresion(nodo.args[i], ambito, `argumento ${i} de invocación`);
      }
    }
  }

  validarAsignacion(nodo, ambito) {
    const target = nodo.target;
    const valor = nodo.valor;

    if (!target || typeof target !== 'object') {
      this.agregarError('Target de asignación inválido');
      return;
    }

    // Validar target
    if (target.tipo === 'id') {
      const id = target.valor;
      if (!ambito[id]) {
        this.agregarError(`Variable no declarada: ${String(id)}`);
        return;
      }

      const tipoVar = ambito[id];
      this.validarValorCompatible(tipoVar, valor, `asignación a ${id}`, ambito);
    } else if (target.tipo === 'acceso_arreglo') {
      const id = target.id;
      if (!ambito[id]) {
        this.agregarError(`Variable no declarada en acceso de arreglo: ${String(id)}`);
        return;
      }

      const tipoVar = ambito[id];
      if (!tipoVar.endsWith('[]')) {
        this.agregarError(`"${id}" no es un arreglo`);
        return;
      }

      this.validarExpresion(target.indice, ambito, `índice de arreglo ${id}`);

      if (typeof target.indice === 'number' && target.indice < 0) {
        this.agregarError(`Índice negativo en arreglo "${id}"`);
      }

      const tipoBase = tipoVar.substring(0, tipoVar.length - 2);
      this.validarValorCompatible(tipoBase, valor, `elemento de arreglo ${id}`, ambito);
    }
  }

  validarWhile(nodo, ambito) {
    if (!nodo.condicion) {
      this.agregarError('Condición de while ausente');
      return;
    }

    this.validarExpresion(nodo.condicion, ambito, 'condición de while');

    if (!Array.isArray(nodo.cuerpo)) {
      this.agregarError('Cuerpo de while inválido');
      return;
    }

    for (let i = 0; i < nodo.cuerpo.length; i++) {
      this.validarSentenciaMain(nodo.cuerpo[i], ambito);
    }
  }

  validarFor(nodo, ambito) {
    const ambitoFor = { ...ambito };

    if (nodo.init) {
      this.validarAsignacion(nodo.init, ambitoFor);
    }

    if (!nodo.condicion) {
      this.agregarError('Condición de for ausente');
    } else {
      this.validarExpresion(nodo.condicion, ambitoFor, 'condición de for');
    }

    if (nodo.paso) {
      const tipoPaso = nodo.paso.tipo;
      if (tipoPaso === 'post_increment' || tipoPaso === 'post_increment_assign') {
        const id = nodo.paso.id;
        if (!ambitoFor[id]) {
          this.agregarError(`Variable no declarada en paso de for: ${String(id)}`);
        }
      }
    }

    if (!Array.isArray(nodo.cuerpo)) {
      this.agregarError('Cuerpo de for inválido');
      return;
    }

    for (let i = 0; i < nodo.cuerpo.length; i++) {
      this.validarSentenciaMain(nodo.cuerpo[i], ambitoFor);
    }
  }

  validarIf(nodo, ambito) {
    if (!nodo.condicion) {
      this.agregarError('Condición de if ausente');
      return;
    }

    this.validarExpresion(nodo.condicion, ambito, 'condición de if');

    if (!Array.isArray(nodo.then)) {
      this.agregarError('Rama then de if inválida');
    } else {
      for (let i = 0; i < nodo.then.length; i++) {
        this.validarSentenciaMain(nodo.then[i], ambito);
      }
    }

    if (Array.isArray(nodo.else)) {
      for (let i = 0; i < nodo.else.length; i++) {
        this.validarSentenciaMain(nodo.else[i], ambito);
      }
    }
  }

  validarExpresion(expr, ambito, contexto) {
    if (expr === null || expr === undefined) return;

    if (typeof expr === 'number' || typeof expr === 'boolean') return;

    if (typeof expr === 'string') {
      // string literal o identificador
      if (expr.length === 0) return;
      if (expr.charAt(0) === '"' || expr.charAt(0) === "'") return; // literal
      if (!ambito[expr]) {
        this.agregarError(`Variable no declarada "${expr}" en ${contexto}`);
      }
      return;
    }

    if (typeof expr !== 'object') return;

    // Expresión compuesta 
    if (expr.op) {
      if (expr.op === '/' && typeof expr.right === 'number' && expr.right === 0) {
        this.agregarError(`División entre cero en ${contexto}`);
      }

      if (expr.left) this.validarExpresion(expr.left, ambito, `${contexto} (left)`);
      if (expr.right) this.validarExpresion(expr.right, ambito, `${contexto} (right)`);
      return;
    }

    // Acceso a arreglo 
    if (expr.tipo === 'acceso_arreglo') {
      const id = expr.id;
      if (!ambito[id]) {
        this.agregarError(`Variable no declarada "${id}" en ${contexto}`);
        return;
      }

      if (!ambito[id].endsWith('[]')) {
        this.agregarError(`"${id}" no es un arreglo en ${contexto}`);
      }

      this.validarExpresion(expr.indice, ambito, `índice en ${contexto}`);
      return;
    }

    // Identificador 
    if (expr.tipo === 'id') {
      const id = expr.valor;
      if (!ambito[id]) {
        this.agregarError(`Variable no declarada "${id}" en ${contexto}`);
      }
      return;
    }
  }

  validarValorCompatible(tipoEsperado, valor, contexto, ambito = {}) {
    if (tipoEsperado.endsWith('[]')) {
      this.agregarError(`No se puede asignar arreglo en ${contexto}`);
      return;
    }

    const tipoValor = this.obtenerTipoValor(valor, ambito);

    if (tipoEsperado === 'int' && tipoValor !== 'int') {
      this.agregarError(`Tipo incompatible en ${contexto}: esperado int, recibido ${tipoValor}`);
    } else if (tipoEsperado === 'float' && !(tipoValor === 'float' || tipoValor === 'int')) {
      this.agregarError(`Tipo incompatible en ${contexto}: esperado float, recibido ${tipoValor}`);
    } else if (tipoEsperado === 'string' && tipoValor !== 'string') {
      this.agregarError(`Tipo incompatible en ${contexto}: esperado string, recibido ${tipoValor}`);
    } else if (tipoEsperado === 'boolean' && tipoValor !== 'boolean') {
      this.agregarError(`Tipo incompatible en ${contexto}: esperado boolean, recibido ${tipoValor}`);
    } else if (tipoEsperado === 'char' && tipoValor !== 'char') {
      this.agregarError(`Tipo incompatible en ${contexto}: esperado char, recibido ${tipoValor}`);
    }
  }

  obtenerTipoValor(valor, ambito = {}) {
    if (typeof valor === 'number') {
      if (Number.isInteger(valor)) return 'int';
      return 'float';
    }

    if (typeof valor === 'boolean') return 'boolean';

    if (typeof valor === 'string') {
      if (valor.length === 0) return 'string';
      if (valor.charAt(0) === '"') return 'string';
      if (valor.charAt(0) === "'") return 'char';

      // Podría ser identificador
      if (ambito[valor]) return ambito[valor];
      return 'unknown';
    }

    if (typeof valor === 'object' && valor.tipo === 'id') {
      return ambito[valor.valor] || 'unknown';
    }

    if (typeof valor === 'object' && valor.op) {
      return 'int'; 
    }

    return 'unknown';
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

export function analizarPrincipal(ast) {
  const analizador = new AnalizadorSemanticoPrincipal();
  return analizador.analizar(ast);
}

export { AnalizadorSemanticoPrincipal };

export default analizarPrincipal;