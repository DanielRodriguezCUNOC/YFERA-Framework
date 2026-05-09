/**
 * Analizador semántico para la lógica principal de YFERA.
 */

import { formatearError, extraerUbicacion } from './semantic-errors.js';

class AnalizadorSemanticoPrincipal {
  constructor(tablasSimbolosCruzadas = {}) {
    this.errores = [];
    this.tablaSimbolos = [];
    this.componentesDeclarados = Array.isArray(tablasSimbolosCruzadas.componentes)
      ? tablasSimbolosCruzadas.componentes
      : [];
    this.tablasDeclaradas = Array.isArray(tablasSimbolosCruzadas.tablas)
      ? tablasSimbolosCruzadas.tablas
      : [];
    this.funcionesDeclaradas = [];
  }

  agregarError(mensaje, linea = null, columna = null, contexto = null) {
    if (linea && typeof linea === 'object') {
      const ubicacion = extraerUbicacion(linea);
      linea = ubicacion.linea;
      columna = columna || ubicacion.columna;
      contexto = contexto || ubicacion.contexto;
    }

    this.errores.push(
      formatearError(mensaje, {
        tipo: 'Error Semántico (Principal)',
        linea,
        columna,
        contexto,
      }),
    );
  }

  analizar(ast) {
    this.errores = [];
    this.tablaSimbolos = [];
    this.funcionesDeclaradas = [];

    if (!Array.isArray(ast)) {
      const programa = this.normalizarPrograma(ast);
      this.validarPrograma(programa);
      return {
        ok: this.errores.length === 0,
        errores: this.errores,
        tablaSimbolos: this.tablaSimbolos.slice(),
      };
    }

    this.validarSentencias(ast, false, 0);

    return {
      ok: this.errores.length === 0,
      errores: this.errores,
      tablaSimbolos: this.tablaSimbolos.slice(),
    };
  }

  normalizarPrograma(ast) {
    if (!ast || typeof ast !== 'object') {
      return { declaraciones: [], funciones: [], main: [] };
    }

    if (ast.tipo === 'programa') {
      return {
        declaraciones: Array.isArray(ast.declaraciones) ? ast.declaraciones : [],
        funciones: Array.isArray(ast.funciones) ? ast.funciones : [],
        main: this.obtenerSentenciasBloque(ast.main),
      };
    }

    if (ast.tipo === 'main') {
      return {
        declaraciones: [],
        funciones: [],
        main: this.obtenerSentenciasBloque(ast),
      };
    }

    return {
      declaraciones: Array.isArray(ast.declaraciones) ? ast.declaraciones : [],
      funciones: Array.isArray(ast.funciones) ? ast.funciones : [],
      main: this.obtenerSentenciasBloque(ast.main),
    };
  }

  validarPrograma(programa) {
    let indice = 0;
    while (indice < programa.declaraciones.length) {
      const decl = programa.declaraciones[indice];
      
      // Registrar variables declaradas antes de validarlas
      if (decl && typeof decl === 'object') {
        const nombreVariable = decl.id || decl.nombre || '';
        if (nombreVariable && !this.existeEnTabla(nombreVariable, 'variable')) {
          this.registrarEnTabla(nombreVariable, 'variable', { 
            tipoDato: decl.dato || decl.tipo || null 
          });
        }
      }
      
      this.validarSentencia(programa.declaraciones[indice], false, 0);
      indice += 1;
    }

    indice = 0;
    while (indice < programa.funciones.length) {
      const func = programa.funciones[indice];
      // Registrar función en tabla de símbolos
      if (func && func.nombre && !this.existeEnTabla(func.nombre, 'funcion')) {
        this.registrarEnTabla(func.nombre, 'funcion', { parametros: func.parametros || [] });
      }
      this.validarFuncion(programa.funciones[indice]);
      indice += 1;
    }

    this.validarSentencias(programa.main, false, 0);
  }

  validarFuncion(nodoFuncion) {
    if (!nodoFuncion || typeof nodoFuncion !== 'object') {
      return;
    }

    const nombreFuncion = nodoFuncion.nombre || nodoFuncion.id || nodoFuncion.identificador || '';
    if (nombreFuncion) {
      // Si no existe, registrar 
      if (!this.existeEnTabla(nombreFuncion, 'funcion')) {
        this.registrarEnTabla(nombreFuncion, 'funcion', { parametros: Array.isArray(nodoFuncion.parametros) ? nodoFuncion.parametros : [] });
      }
      if (!this.funcionesDeclaradas.includes(nombreFuncion)) {
        this.funcionesDeclaradas.push(nombreFuncion);
      }
    }

    let indice = 0;
    while (indice < (Array.isArray(nodoFuncion.parametros) ? nodoFuncion.parametros.length : 0)) {
      const parametro = nodoFuncion.parametros[indice];
      if (parametro && parametro.id && !this.existeEnTabla(parametro.id, 'variable')) {
        this.registrarEnTabla(parametro.id, 'variable', { tipoDato: parametro.tipo || null, esParametro: true });
      }
      indice += 1;
    }

    this.validarSentencias(this.obtenerSentenciasBloque(nodoFuncion), true, 1);
  }

  validarSentencia(nodo, enBloque, nivelAnidacion) {
    if (!nodo || typeof nodo !== 'object') {
      return;
    }

    switch (nodo.tipo) {
      case 'variable_decl':
      case 'declaracion': {
        if (enBloque) {
          this.agregarError('No se permiten declaraciones de variables dentro de bloques. Solo se permiten variables globales.', nodo);
          return;
        }

        const nombreVariable = nodo.id || nodo.nombre || '';
        if (!nombreVariable) {
          this.agregarError('Declaración de variable sin nombre', nodo);
          return;
        }

        // Si ya existe no registrar de nuevo
        if (!this.existeEnTabla(nombreVariable, 'variable')) {
          this.registrarEnTabla(nombreVariable, 'variable', { tipoDato: nodo.tipoDato || nodo.tipo || null });
        }
        break;
      }

      case 'render':
      case 'invocacion':
        this.validarInvocacion(nodo.invocacion || nodo, nodo);
        break;

      case 'asignacion':
        this.validarDestinoAsignacion(nodo.target, nodo);
        this.validarExpresion(nodo.valor);
        break;

      case 'execute':
      case 'load':        // No validar consultas backtick como expresiones normales
        // Solo validar valores interpolados dentro de la consulta si es necesario
        break;

      case 'if':
        this.validarExpresion(nodo.condicion);
        this.validarSentencias(this.obtenerSentenciasBloque(nodo), true, nivelAnidacion + 1);

        if (Array.isArray(nodo.elseIfs)) {
          let indiceElseIf = 0;
          while (indiceElseIf < nodo.elseIfs.length) {
            const parte = nodo.elseIfs[indiceElseIf];
            if (parte) {
              this.validarExpresion(parte.condicion);
              this.validarSentencias(this.obtenerSentenciasBloque(parte), true, nivelAnidacion + 1);
            }
            indiceElseIf += 1;
          }
        }

        if (nodo.else) {
          this.validarSentencias(this.obtenerSentenciasBloque(nodo.else), true, nivelAnidacion + 1);
        }
        break;

      case 'while':
      case 'do_while':
        this.validarExpresion(nodo.condicion);
        this.validarSentencias(this.obtenerSentenciasBloque(nodo), true, nivelAnidacion + 1);
        break;

      case 'for':
        // Auto-declarar variable de control del for
        if (nodo.init && nodo.init.target && nodo.init.target.tipo === 'id') {
          const nombreVariable = nodo.init.target.valor;
          if (nombreVariable && !this.existeEnTabla(nombreVariable, 'variable')) {
            this.registrarEnTabla(nombreVariable, 'variable', { tipoDato: 'int', autoDeclarado: true });
          }
        }
        
        this.validarSentencia(nodo.init, true, nivelAnidacion + 1);
        this.validarExpresion(nodo.condicion);
        this.validarSentencia(nodo.paso, true, nivelAnidacion + 1);
        this.validarSentencias(this.obtenerSentenciasBloque(nodo), true, nivelAnidacion + 1);
        break;

      case 'switch':
        this.validarExpresion(nodo.expresion);
        this.validarCasosSwitch(nodo.casos, nivelAnidacion + 1);
        break;

      case 'case':
      case 'default':
        this.validarSentencias(this.obtenerSentenciasBloque(nodo), true, nivelAnidacion + 1);
        break;

      default:
        this.validarSentenciasInternasSiExisten(nodo, nivelAnidacion);
        break;
    }
  }

  validarSentencias(sentencias, enBloque, nivelAnidacion) {
    if (!Array.isArray(sentencias)) {
      return;
    }

    let indice = 0;
    while (indice < sentencias.length) {
      this.validarSentencia(sentencias[indice], enBloque, nivelAnidacion);
      indice += 1;
    }
  }

  validarSentenciasInternasSiExisten(nodo, nivelAnidacion) {
    if (!nodo || typeof nodo !== 'object') {
      return;
    }

    if (Array.isArray(nodo.sentencias)) {
      this.validarSentencias(nodo.sentencias, true, nivelAnidacion + 1);
    }

    if (Array.isArray(nodo.cuerpo)) {
      this.validarSentencias(nodo.cuerpo, true, nivelAnidacion + 1);
    }
  }

  validarInvocacion(invocacion, nodoOrigen) {
    if (!invocacion || typeof invocacion !== 'object') {
      return;
    }

    const nombre = invocacion.componente || invocacion.nombre || '';
    

    if (Array.isArray(invocacion.args)) {
      let indice = 0;
      while (indice < invocacion.args.length) {
        this.validarExpresion(invocacion.args[indice]);
        indice += 1;
      }
    }
  }

  validarDestinoAsignacion(destino, nodoOrigen) {
    if (!destino) {
      return;
    }

    if (typeof destino === 'string') {
      return;
    }

    if (destino.tipo === 'id') {
      return;
    }

    if (destino.tipo === 'acceso_arreglo') {
      this.validarExpresion(destino.indice);
      return;
    }

    if (nodoOrigen) {
      this.agregarError('Destino de asignación inválido', nodoOrigen);
    }
  }

  validarCasosSwitch(casos, nivelAnidacion) {
    if (!Array.isArray(casos)) {
      return;
    }

    let indice = 0;
    while (indice < casos.length) {
      const caso = casos[indice];
      if (caso) {
        if (caso.tipo === 'case') {
          this.validarExpresion(caso.valor);
          this.validarSentencias(this.obtenerSentenciasBloque(caso), true, nivelAnidacion + 1);
        } else if (caso.tipo === 'default') {
          this.validarSentencias(this.obtenerSentenciasBloque(caso), true, nivelAnidacion + 1);
        }
      }
      indice += 1;
    }
  }

  validarExpresion(expresion) {
    if (!expresion) {
      return;
    }

    if (typeof expresion === 'string') {
      // Ignorar literales de cadena 
      if ((expresion.startsWith('"') && expresion.endsWith('"')) || 
          (expresion.startsWith("'") && expresion.endsWith("'"))) {
        return;
      }
      // Ignorar números
      if (!isNaN(expresion)) {
        return;
      }
      this.validarReferenciaVariableTexto(expresion, expresion);
      return;
    }

    if (typeof expresion !== 'object') {
      return;
    }

    if (expresion.tipo === 'variable') {
      const nombreVariable = this.quitarPrefijo(expresion.valor || expresion.id || '', '$');
      this.validarReferenciaVariableTexto(nombreVariable, expresion);
      return;
    }

    if (expresion.tipo === 'id') {
      this.validarReferenciaVariableTexto(expresion.valor, expresion);
      return;
    }

    if (expresion.tipo === 'acceso_arreglo') {
      this.validarReferenciaVariableTexto(expresion.id, expresion);
      this.validarExpresion(expresion.indice);
      return;
    }

    if (Array.isArray(expresion.lista)) {
      let indice = 0;
      while (indice < expresion.lista.length) {
        this.validarExpresion(expresion.lista[indice]);
        indice += 1;
      }
    }

    if (expresion.left !== undefined) {
      this.validarExpresion(expresion.left);
    }

    if (expresion.right !== undefined) {
      this.validarExpresion(expresion.right);
    }

    if (expresion.condicion !== undefined) {
      this.validarExpresion(expresion.condicion);
    }

    if (expresion.valor !== undefined) {
      this.validarExpresion(expresion.valor);
    }

    if (Array.isArray(expresion.args)) {
      let indice = 0;
      while (indice < expresion.args.length) {
        this.validarExpresion(expresion.args[indice]);
        indice += 1;
      }
    }
  }

  validarReferenciaVariableTexto(valor, nodoOrigen) {
    const nombre = this.quitarPrefijo(valor, '$');
    if (!nombre) {
      return;
    }

    // Permitir referencias a variables O funciones 
    const esVariable = this.existeEnTabla(nombre, 'variable');
    const esFuncion = this.existeEnTabla(nombre, 'funcion');
    
    if (!esVariable && !esFuncion) {
      this.agregarError(`Variable no declarada: ${nombre}`, nodoOrigen);
    }
  }

  obtenerSentenciasBloque(nodo) {
    if (!nodo || typeof nodo !== 'object') {
      return [];
    }

    if (Array.isArray(nodo)) {
      return nodo;
    }

    if (Array.isArray(nodo.sentencias)) {
      return nodo.sentencias;
    }

    if (Array.isArray(nodo.cuerpo)) {
      return nodo.cuerpo;
    }

    if (nodo.then && Array.isArray(nodo.then)) {
      return nodo.then;
    }

    if (nodo.else && Array.isArray(nodo.else)) {
      return nodo.else;
    }

    return [];
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

  registrarEnTabla(nombre, tipo, info = {}) {
    this.tablaSimbolos.push({
      nombre,
      tipo,
      ...info,
    });
  }

  existeEnTabla(nombre, tipo) {
    let indice = 0;
    while (indice < this.tablaSimbolos.length) {
      const entrada = this.tablaSimbolos[indice];
      if (entrada.nombre === nombre && entrada.tipo === tipo) {
        return true;
      }
      indice += 1;
    }
    return false;
  }

  existeComponente(nombre) {
    let indice = 0;
    while (indice < this.componentesDeclarados.length) {
      const componente = this.componentesDeclarados[indice];
      if (componente && componente.nombre === nombre) {
        return true;
      }
      indice += 1;
    }
    return false;
  }
}

export function analizarPrincipal(ast, tablasCruzadas) {
  const analizador = new AnalizadorSemanticoPrincipal(tablasCruzadas);
  return analizador.analizar(ast);
}

export default AnalizadorSemanticoPrincipal;