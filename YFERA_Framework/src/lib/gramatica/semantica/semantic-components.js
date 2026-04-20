/*
* Analizador semantico para los componentes
*/

class AnalizadorSemanticoComponentes {

  constructor() {
    this.errores = [];
    this.componentesDeclarados = {};
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
    this.componentesDeclarados = {};

    const componentes = this.obtenerComponentes(ast);
    if (!Array.isArray(componentes)) {
      this.agregarError('El AST de componentes no tiene una lista válida de componentes');
      return { ok: false, errores: this.errores };
    }

    this.recolectarComponentes(componentes);

    for (let i = 0; i < componentes.length; i++) {
      this.validarComponente(componentes[i]);
    }

    return {
      ok: this.errores.length === 0,
      errores: this.errores
    };
  }

  obtenerComponentes(ast) {
    if (Array.isArray(ast)) return ast;
    if (!ast || typeof ast !== 'object') return null;
    if (Array.isArray(ast.componentes)) return ast.componentes;
    if (Array.isArray(ast.lista_componentes)) return ast.lista_componentes;
    if (Array.isArray(ast.programa)) return ast.programa;
    return null;
  }

  recolectarComponentes(componentes) {
    for (let i = 0; i < componentes.length; i++) {
      const comp = componentes[i];
      if (!comp || typeof comp !== 'object') {
        this.agregarError('Componente inválido en AST');
        continue;
      }

      const nombre = this.obtenerNombreComponente(comp);
      if (!this.esIdentificadorValido(nombre)) {
        this.agregarError(`Nombre de componente inválido: ${String(nombre)}`);
        continue;
      }

      if (this.componentesDeclarados[nombre]) {
        this.agregarError(`Componente duplicado: ${nombre}`);
        continue;
      }

      this.componentesDeclarados[nombre] = true;
    }
  }

  validarComponente(comp) {
    const nombre = this.obtenerNombreComponente(comp);

    const ambito = {
      variables: {},
      camposFormulario: {}
    };

    const params = this.obtenerParametros(comp);
    this.validarParametros(params, nombre, ambito);

    const elementos = this.obtenerElementos(comp);
    for (let i = 0; i < elementos.length; i++) {
      this.validarNodo(elementos[i], nombre, ambito);
    }
  }

  obtenerNombreComponente(comp) {
    if (!comp || typeof comp !== 'object') return null;
    if (typeof comp.nombre === 'string') return comp.nombre;
    if (typeof comp.id === 'string') return comp.id;
    if (typeof comp.identificador === 'string') return comp.identificador;
    return null;
  }

  obtenerParametros(comp) {
    if (!comp || typeof comp !== 'object') return [];
    if (Array.isArray(comp.parametros)) return comp.parametros;
    if (Array.isArray(comp.lista_parametros)) return comp.lista_parametros;
    return [];
  }

  obtenerElementos(comp) {
    if (!comp || typeof comp !== 'object') return [];
    if (Array.isArray(comp.elementos)) return comp.elementos;
    if (Array.isArray(comp.lista_elementos)) return comp.lista_elementos;
    if (Array.isArray(comp.cuerpo)) return comp.cuerpo;
    return [];
  }

  validarParametros(parametros, nombreComponente, ambito) {
    const vistos = {};

    for (let i = 0; i < parametros.length; i++) {
      const p = parametros[i];
      const nombre = p && (p.nombre || p.id || p.identificador);
      const tipo = p && (p.tipoDato || p.tipo || p.tipo_parametro);

      if (!this.esIdentificadorValido(nombre)) {
        this.agregarError(`Parámetro inválido en componente ${nombreComponente}`);
        continue;
      }

      if (vistos[nombre]) {
        this.agregarError(`Parámetro duplicado "${nombre}" en componente ${nombreComponente}`);
      } else {
        vistos[nombre] = true;
      }

      if (typeof tipo === 'string' && !this.tiposValidos[tipo]) {
        this.agregarError(`Tipo de parámetro no válido "${tipo}" en componente ${nombreComponente}`);
      }

      ambito.variables['$' + nombre] = true;
      ambito.variables[nombre] = true;
    }
  }

  validarNodo(nodo, nombreComponente, ambito) {
    if (!nodo || typeof nodo !== 'object') return;

    const tipo = this.obtenerTipoNodo(nodo);

    if (tipo === 'formulario' || tipo === 'form' || tipo === 'FORMULARIO') {
      this.validarFormulario(nodo, nombreComponente, ambito);
      return;
    }

    if (tipo === 'ciclo_for' || tipo === 'for') {
      this.validarFor(nodo, nombreComponente, ambito);
      return;
    }

    if (tipo === 'ciclo_for_each' || tipo === 'for_each' || tipo === 'foreach') {
      this.validarForEach(nodo, nombreComponente, ambito);
      return;
    }

    if (tipo === 'condicional' || tipo === 'if') {
      this.validarCondicional(nodo, nombreComponente, ambito);
      return;
    }

    if (tipo === 'switch_stmt' || tipo === 'switch') {
      this.validarSwitch(nodo, nombreComponente, ambito);
      return;
    }

    if (tipo === 'tabla' || tipo === 'table') {
      this.validarTabla(nodo, nombreComponente, ambito);
      return;
    }

    if (tipo === 'componente_instancia' || tipo === 'instancia' || tipo === 'elemento') {
      this.validarInstanciaComponente(nodo, nombreComponente, ambito);
    }

    this.validarExpresionesNodo(nodo, nombreComponente, ambito);
    this.recorrerArreglosHijos(nodo, nombreComponente, ambito);
  }

  obtenerTipoNodo(nodo) {
    if (!nodo || typeof nodo !== 'object') return '';
    if (typeof nodo.tipo === 'string') return nodo.tipo;
    if (typeof nodo.kind === 'string') return nodo.kind;
    if (typeof nodo.tag === 'string') return nodo.tag;
    return '';
  }

  validarInstanciaComponente(nodo, nombreComponente, ambito) {
    const nombre = nodo.nombre || nodo.componente || nodo.identificador;
    if (typeof nombre === 'string') {
      const esInterno = this.componentesDeclarados[nombre] === true;
      const esReservadoUI =
        nombre === 'T' || nombre === 'IMG' || nombre === 'FORM' ||
        nombre === 'INPUT_TEXT' || nombre === 'INPUT_NUMBER' ||
        nombre === 'INPUT_BOOL' || nombre === 'SUBMIT';

      if (!esInterno && !esReservadoUI) {
        this.agregarError(`Uso de componente no declarado: ${nombre} (en ${nombreComponente})`);
      }
    }
  }

  validarFormulario(nodo, nombreComponente, ambito) {
    const inputs = Array.isArray(nodo.inputs) ? nodo.inputs : (Array.isArray(nodo.lista_inputs) ? nodo.lista_inputs : []);
    const ids = {};

    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i];
      const props = Array.isArray(inp && inp.propiedades) ? inp.propiedades : (Array.isArray(inp && inp.lista_propiedades_input) ? inp.lista_propiedades_input : []);
      const propsVistas = {};
      let idValor = null;

      for (let j = 0; j < props.length; j++) {
        const p = props[j];
        const nombre = p && (p.propiedad || p.nombre);
        const valor = p && (p.valor !== undefined ? p.valor : p.expresion);

        if (typeof nombre !== 'string') {
          this.agregarError(`Propiedad inválida en input de ${nombreComponente}`);
          continue;
        }

        if (propsVistas[nombre]) {
          this.agregarError(`Propiedad duplicada "${nombre}" en input de ${nombreComponente}`);
        } else {
          propsVistas[nombre] = true;
        }

        if (nombre === 'id') {
          idValor = valor;
          if (!this.esIdentificadorValido(valor)) {
            this.agregarError(`id inválido en formulario de ${nombreComponente}: ${String(valor)}`);
          }
        }

        this.validarExpresion(valor, nombreComponente, ambito);
      }

      if (idValor !== null) {
        if (ids[idValor]) {
          this.agregarError(`id duplicado en formulario "${idValor}" en ${nombreComponente}`);
        } else {
          ids[idValor] = true;
          ambito.camposFormulario[idValor] = true;
        }
      }
    }

    const submit = nodo.submit || nodo.bloc_submit || null;
    if (submit) {
      this.validarExpresionesNodo(submit, nombreComponente, ambito);
    }
  }

  validarFor(nodo, nombreComponente, ambitoPadre) {
    const ambito = this.clonarAmbito(ambitoPadre);

    const vars = Array.isArray(nodo.lista_for_vars) ? nodo.lista_for_vars : [];
    for (let i = 0; i < vars.length; i++) {
      const v = vars[i];
      const nombre = v && (v.nombre || v.variable || v.id);
      if (typeof nombre !== 'string' || nombre.charAt(0) !== '$') {
        this.agregarError(`Variable de for inválida en ${nombreComponente}`);
      } else {
        ambito.variables[nombre] = true;
      }

      if (v && v.valorInicial !== undefined) {
        this.validarExpresion(v.valorInicial, nombreComponente, ambito);
      }
    }

    if (nodo.condicion !== undefined) {
      this.validarExpresion(nodo.condicion, nombreComponente, ambito);
    }

    const cuerpo = Array.isArray(nodo.cuerpo) ? nodo.cuerpo : (Array.isArray(nodo.elementos) ? nodo.elementos : []);
    for (let i = 0; i < cuerpo.length; i++) {
      this.validarNodo(cuerpo[i], nombreComponente, ambito);
    }
  }

  validarForEach(nodo, nombreComponente, ambitoPadre) {
    const ambito = this.clonarAmbito(ambitoPadre);

    const variable = nodo.variable || nodo.item || nodo.iterador;
    if (typeof variable === 'string') {
      if (variable.charAt(0) === '$') ambito.variables[variable] = true;
      else ambito.variables['$' + variable] = true;
    } else {
      this.agregarError(`Variable de for-each inválida en ${nombreComponente}`);
    }

    if (nodo.coleccion !== undefined) {
      this.validarExpresion(nodo.coleccion, nombreComponente, ambitoPadre);
    }

    if (nodo.track !== undefined) {
      this.validarExpresion(nodo.track, nombreComponente, ambito);
    }

    const cuerpo = Array.isArray(nodo.cuerpo) ? nodo.cuerpo : (Array.isArray(nodo.elementos) ? nodo.elementos : []);
    for (let i = 0; i < cuerpo.length; i++) {
      this.validarNodo(cuerpo[i], nombreComponente, ambito);
    }
  }

  validarCondicional(nodo, nombreComponente, ambito) {
    this.validarExpresion(nodo.condicion, nombreComponente, ambito);

    const cuerpoIf = Array.isArray(nodo.entonces) ? nodo.entonces : (Array.isArray(nodo.cuerpo) ? nodo.cuerpo : []);
    for (let i = 0; i < cuerpoIf.length; i++) {
      this.validarNodo(cuerpoIf[i], nombreComponente, ambito);
    }

    const listaElse = Array.isArray(nodo.lista_else) ? nodo.lista_else : (Array.isArray(nodo.sino) ? nodo.sino : []);
    for (let i = 0; i < listaElse.length; i++) {
      this.validarNodo(listaElse[i], nombreComponente, ambito);
    }
  }

  validarSwitch(nodo, nombreComponente, ambito) {
    this.validarExpresion(nodo.expresion, nombreComponente, ambito);

    const casos = Array.isArray(nodo.lista_casos) ? nodo.lista_casos : (Array.isArray(nodo.casos) ? nodo.casos : []);
    const vistos = {};
    let defaultCount = 0;

    for (let i = 0; i < casos.length; i++) {
      const c = casos[i];
      const tipoCaso = this.obtenerTipoNodo(c);

      if (tipoCaso === 'caso_defecto' || tipoCaso === 'default') {
        defaultCount++;
        const cuerpoDef = Array.isArray(c.cuerpo) ? c.cuerpo : [];
        for (let j = 0; j < cuerpoDef.length; j++) {
          this.validarNodo(cuerpoDef[j], nombreComponente, ambito);
        }
        continue;
      }

      const valor = c && (c.valor !== undefined ? c.valor : c.expresion);
      const llave = String(valor);
      if (vistos[llave]) {
        this.agregarError(`Valor de case duplicado en switch de ${nombreComponente}: ${llave}`);
      } else {
        vistos[llave] = true;
      }

      this.validarExpresion(valor, nombreComponente, ambito);

      const cuerpo = Array.isArray(c && c.cuerpo) ? c.cuerpo : [];
      for (let j = 0; j < cuerpo.length; j++) {
        this.validarNodo(cuerpo[j], nombreComponente, ambito);
      }
    }

    if (defaultCount > 1) {
      this.agregarError(`Switch con más de un default en ${nombreComponente}`);
    }
  }

  validarTabla(nodo, nombreComponente, ambito) {
    const filas = Array.isArray(nodo.filas) ? nodo.filas : (Array.isArray(nodo.tabla_contenido) ? nodo.tabla_contenido : []);
    let columnasEsperadas = -1;

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const celdas = Array.isArray(fila && fila.celdas) ? fila.celdas : (Array.isArray(fila && fila.fila_tabla) ? fila.fila_tabla : []);
      if (columnasEsperadas === -1) columnasEsperadas = celdas.length;
      else if (celdas.length !== columnasEsperadas) {
        this.agregarError(`Tabla irregular en ${nombreComponente}: filas con distinto número de columnas`);
      }

      for (let j = 0; j < celdas.length; j++) {
        this.validarExpresion(celdas[j], nombreComponente, ambito);
      }
    }
  }

  validarExpresionesNodo(nodo, nombreComponente, ambito) {
    if (!nodo || typeof nodo !== 'object') return;

    const claves = Object.keys(nodo);
    for (let i = 0; i < claves.length; i++) {
      const k = claves[i];
      const v = nodo[k];

      if (k === 'expresion' || k === 'condicion' || k === 'valor' || k === 'argumento') {
        this.validarExpresion(v, nombreComponente, ambito);
      }
    }
  }

  recorrerArreglosHijos(nodo, nombreComponente, ambito) {
    const claves = Object.keys(nodo);
    for (let i = 0; i < claves.length; i++) {
      const k = claves[i];
      const v = nodo[k];

      if (Array.isArray(v)) {
        for (let j = 0; j < v.length; j++) {
          const hijo = v[j];
          if (hijo && typeof hijo === 'object') {
            this.validarNodo(hijo, nombreComponente, ambito);
          }
        }
      }
    }
  }

  validarExpresion(expr, nombreComponente, ambito) {
    if (expr === null || expr === undefined) return;

    if (typeof expr === 'number' || typeof expr === 'boolean') return;

    if (typeof expr === 'string') {
      if (expr.length === 0) return;

      if (expr.charAt(0) === '$') {
        if (!ambito.variables[expr]) {
          this.agregarError(`Variable no declarada ${expr} en ${nombreComponente}`);
        }
        return;
      }

      if (expr.charAt(0) === '@') {
        if (expr.length === 1) return; // referencia a id formulario XD
        const campo = expr.substring(1);
        if (!this.esIdentificadorValido(campo)) {
          this.agregarError(`Referencia de campo inválida "${expr}" en ${nombreComponente}`);
        } else if (!ambito.camposFormulario[campo]) {
          this.agregarError(`Referencia a campo no declarado "${expr}" en ${nombreComponente}`);
        }
        return;
      }

      return;
    }

    if (typeof expr !== 'object') return;

    if (expr.op === '/' && typeof expr.right === 'number' && expr.right === 0) {
      this.agregarError(`División entre cero en ${nombreComponente}`);
    }

    if (expr.left !== undefined) this.validarExpresion(expr.left, nombreComponente, ambito);
    if (expr.right !== undefined) this.validarExpresion(expr.right, nombreComponente, ambito);
    if (expr.expresion !== undefined) this.validarExpresion(expr.expresion, nombreComponente, ambito);
    if (expr.valor !== undefined) this.validarExpresion(expr.valor, nombreComponente, ambito);
  }

  clonarAmbito(ambito) {
    const nuevo = {
      variables: {},
      camposFormulario: {}
    };

    const vKeys = Object.keys(ambito.variables);
    for (let i = 0; i < vKeys.length; i++) nuevo.variables[vKeys[i]] = true;

    const cKeys = Object.keys(ambito.camposFormulario);
    for (let i = 0; i < cKeys.length; i++) nuevo.camposFormulario[cKeys[i]] = true;

    return nuevo;
  }

  esIdentificadorValido(id) {
    if (typeof id !== 'string') return false;
    if (id.length === 0) return false;

    const c0 = id.charAt(0);
    if (!this.esLetra(c0) && c0 !== '_') return false;

    for (let i = 1; i < id.length; i++) {
      const c = id.charAt(i);
      if (!this.esLetra(c) && !this.esDigito(c) && c !== '_' && c !== '-') return false;
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

export function analizarComponentes(ast) {
  const analizador = new AnalizadorSemanticoComponentes();
  return analizador.analizar(ast);
}

export { AnalizadorSemanticoComponentes };

export default analizarComponentes;