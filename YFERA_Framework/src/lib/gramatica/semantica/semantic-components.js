/**
 * Analizador semántico para los componentes de YFERA.
 */

import { formatearError, extraerUbicacion } from './semantic-errors.js';

class AnalizadorSemanticoComponentes {
  constructor() {
    this.errores = [];
    this.tablaSimbolos = [];
  }

  agregarError(mensaje, linea = null, columna = null, contexto = null) {
    if (linea && typeof linea === 'object') {
      const loc = extraerUbicacion(linea);
      linea = loc.linea;
      columna = columna || loc.columna;
      contexto = contexto || loc.contexto;
    }
    this.errores.push(formatearError(mensaje, { tipo: 'Error Semántico (Componentes)', linea, columna, contexto }));
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

  esNodoControl(tipo) {
    return tipo === 'if' || tipo === 'else_if' || tipo === 'for' || tipo === 'for_each_simple' || tipo === 'for_each_track' || tipo === 'while' || tipo === 'switch';
  }

  obtenerBloque(nodo, nombrePrincipal = 'cuerpo', nombreAlterno = 'sentencias') {
    if (!nodo || typeof nodo !== 'object') {
      return [];
    }

    if (Array.isArray(nodo[nombrePrincipal])) {
      return nodo[nombrePrincipal];
    }

    if (Array.isArray(nodo[nombreAlterno])) {
      return nodo[nombreAlterno];
    }

    return [];
  }

  normalizarNombreVariable(valor) {
    return this.quitarPrefijo(valor, '$');
  }

  agregarVariablesTemporales(nombres) {
    const indiceInicio = this.tablaSimbolos.length;
    if (!Array.isArray(nombres)) {
      return indiceInicio;
    }

    let indice = 0;
    while (indice < nombres.length) {
      const nombre = this.normalizarNombreVariable(nombres[indice]);
      if (nombre) {
        this.registrarEnTabla(nombre, 'variable', { tipoDato: 'temporal' });
      }
      indice += 1;
    }

    return indiceInicio;
  }

  restaurarVariablesTemporales(indiceInicio) {
    if (typeof indiceInicio === 'number' && indiceInicio >= 0) {
      this.tablaSimbolos.length = indiceInicio;
    }
  }

  recolectarComponentes(ast) {
    let i = 0;
    while (i < ast.length) {
      const nodo = ast[i];
      if (nodo.tipo === 'componente') {
        const nombre = nodo.nombre;
        if (this.existeEnTabla(nombre, 'componente')) {
          this.agregarError(`Componente duplicado: ${nombre}`, nodo);
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

    this.validarElementos(comp.elementos, 0);
  }

  validarElementos(elementos, nivelControl = 0) {
    let e = 0;
    while (e < elementos.length) {
      const el = elementos[e];
      this.validarElemento(el, nivelControl);
      e += 1;
    }
  }

  validarElemento(nodo, nivelControl = 0) {
    if (!nodo) return;

    if (this.esNodoControl(nodo.tipo) && nivelControl > 0 && nodo.tipo !== 'else_if') {
      this.agregarError('No se permiten estructuras de control anidadas dentro de componentes.', nodo);
      return;
    }

    switch (nodo.tipo) {
      case 'seccion':
        this.validarElementos(this.obtenerBloque(nodo, 'elementos', 'cuerpo'), nivelControl);
        break;

      case 'if':
        this.validarExpresion(nodo.condicion);

        this.validarElementos(this.obtenerBloque(nodo, 'cuerpo', 'sentencias'), nivelControl + 1);

        if (Array.isArray(nodo.elseIfs)) {
          let indiceElseIf = 0;
          while (indiceElseIf < nodo.elseIfs.length) {
            const parte = nodo.elseIfs[indiceElseIf];
            if (parte) {
              this.validarExpresion(parte.condicion);
              this.validarElementos(this.obtenerBloque(parte, 'cuerpo', 'sentencias'), nivelControl + 1);
            }
            indiceElseIf += 1;
          }
        }

        if (nodo.else) {
          this.validarElementos(this.obtenerBloque(nodo.else, 'cuerpo', 'sentencias'), nivelControl + 1);
        }
        break;

      case 'for':
        this.validarElementos(this.obtenerBloque(nodo, 'cuerpo', 'sentencias'), nivelControl + 1);
        break;

      case 'while':
        this.validarElementos(this.obtenerBloque(nodo, 'cuerpo', 'sentencias'), nivelControl + 1);
        break;

      case 'switch':
        this.validarExpresion(nodo.variable || nodo.expresion);
        this.validarCasosSwitch(nodo.casos, nodo.defecto, nivelControl + 1);
        break;

      case 'for_each_simple':
        this.validarExpresion(nodo.origen);
        this.validarExpresion(nodo.item);

        let inicioTemporalesSimple = this.agregarVariablesTemporales([nodo.origen, nodo.item]);
        this.validarElementos(this.obtenerBloque(nodo, 'cuerpo', 'sentencias'), nivelControl + 1);
        if (nodo.vacio) {
          this.validarElementos(this.obtenerBloque(nodo.vacio, 'cuerpo', 'sentencias'), nivelControl + 1);
        }
        this.restaurarVariablesTemporales(inicioTemporalesSimple);
        break;

      case 'for_each_track':
        let nombresTemporalesTrack = [];
        if (Array.isArray(nodo.pares)) {
          let indicePar = 0;
          while (indicePar < nodo.pares.length) {
            const par = nodo.pares[indicePar];
            if (par) {
              this.validarExpresion(par.origen);
              this.validarExpresion(par.actual);
              nombresTemporalesTrack.push(par.origen);
              nombresTemporalesTrack.push(par.actual);
            }
            indicePar += 1;
          }
        }

        this.validarExpresion(nodo.indice);

        nombresTemporalesTrack.push(nodo.indice);
        let inicioTemporalesTrack = this.agregarVariablesTemporales(nombresTemporalesTrack);
        this.validarElementos(this.obtenerBloque(nodo, 'cuerpo', 'sentencias'), nivelControl + 1);
        if (nodo.vacio) {
          this.validarElementos(this.obtenerBloque(nodo.vacio, 'cuerpo', 'sentencias'), nivelControl + 1);
        }
        this.restaurarVariablesTemporales(inicioTemporalesTrack);
        break;

      case 'declaracion':
      case 'variable_decl':
        this.agregarError(`Error: No se permiten declaraciones de variables dentro de componentes. Solo se permiten variables globales.`, nodo);
        break;
    }
  }

  validarCasosSwitch(casos, defecto, nivelControl = 0) {
    if (Array.isArray(casos)) {
      let indice = 0;
      while (indice < casos.length) {
        const caso = casos[indice];
        if (caso) {
          this.validarExpresion(caso.valor);
          this.validarElementos(this.obtenerBloque(caso, 'cuerpo', 'sentencias'), nivelControl + 1);
        }
        indice += 1;
      }
    }

    if (defecto) {
      this.validarElementos(this.obtenerBloque(defecto, 'cuerpo', 'sentencias'), nivelControl + 1);
    }
  }

  validarExpresion(exp) {
    if (!exp) return;

    if (exp.tipo === 'variable') {
      const nombreVar = this.normalizarNombreVariable(exp.valor);
      if (!this.existeEnTabla(nombreVar, 'variable')) {
        this.agregarError(`Variable no declarada: ${nombreVar} aqui no hacemos esto :v`, exp);
      }
    } else if (exp.tipo === 'id') {
      const nombreVar = this.normalizarNombreVariable(exp.valor);
      if (!this.existeEnTabla(nombreVar, 'variable')) {
        this.agregarError(`Variable no declarada: ${nombreVar} aqui no hacemos esto :v`, exp);
      }
    } else if (exp.op) {
      this.validarExpresion(exp.left);
      this.validarExpresion(exp.right);
    } else if (Array.isArray(exp.args)) {
      let indice = 0;
      while (indice < exp.args.length) {
        this.validarExpresion(exp.args[indice]);
        indice += 1;
      }
    }
  }

  quitarPrefijo(texto, prefijo) {
    if (typeof texto !== 'string' || typeof prefijo !== 'string') {
      return texto;
    }

    if (texto.indexOf(prefijo) === 0) {
      return texto.substring(prefijo.length);
    }

    return texto;
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