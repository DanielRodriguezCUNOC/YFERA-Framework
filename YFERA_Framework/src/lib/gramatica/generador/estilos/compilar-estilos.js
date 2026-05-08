/*
* Orquestador de compilación de estilos.
* Encadena: semántica -> limpieza -> extends -> código intermedio -> CSS final
*/

import analizarEstilos from '../../semantica/semantic-styles.js';
import expandirForsEstilos from './limpiar-styles.js';
import resolverExtiendeStyles from './extends-style.js';
import normalizarEstilos from './codigo-intermedio-styles.js';
import generarCssDesdeEstilos from './generar-css.js';

function obtenerListaEstilos(resultado) {
  if (Array.isArray(resultado)) {
    return resultado;
  }

  if (resultado && Array.isArray(resultado.estilos)) {
    return resultado.estilos;
  }

  return [];
}

function obtenerTablaSimbolos(resultado) {
  if (resultado && Array.isArray(resultado.tablaSimbolos)) {
    return resultado.tablaSimbolos;
  }

  return [];
}

function normalizarAstEstilos(ast) {
  if (!Array.isArray(ast)) {
    return [];
  }

  const normalizados = [];
  let indice = 0;

  while (indice < ast.length) {
    normalizados.push(normalizarNodoEstilo(ast[indice]));
    indice += 1;
  }

  return normalizados;
}

function normalizarNodoEstilo(nodo) {
  if (!nodo || typeof nodo !== 'object') {
    return nodo;
  }

  const copia = Array.isArray(nodo) ? nodo.slice() : { ...nodo };

  if (copia.tipo === 'estilo') {
    copia.selector = typeof copia.selector === 'string' && copia.selector.length > 0
      ? copia.selector
      : copia.nombre;
    copia.extiende = copia.extiende || copia.heredaDe || null;
    copia.propiedades = Array.isArray(copia.propiedades)
      ? copia.propiedades.map(normalizarPropiedadEstilo)
      : [];
    return copia;
  }

  if (copia.tipo === 'for' || copia.tipo === 'para') {
    copia.tipo = 'for';
    copia.estilos = Array.isArray(copia.estilos)
      ? copia.estilos.map(normalizarNodoEstilo)
      : Array.isArray(copia.propiedades)
        ? copia.propiedades.map(normalizarNodoEstilo)
        : [];
    copia.desde = copia.desde || copia.inicio || null;
    copia.hasta = copia.hasta || copia.fin || null;
    return copia;
  }

  return copia;
}

function normalizarPropiedadEstilo(propiedad) {
  if (!propiedad || typeof propiedad !== 'object') {
    return propiedad;
  }

  const copia = { ...propiedad };
  copia.propiedad = typeof copia.propiedad === 'string' && copia.propiedad.length > 0
    ? copia.propiedad
    : copia.nombre;
  return copia;
}

function compilarEstilos(ast, opciones = {}) {
  const errores = [];

  const astNormalizado = normalizarAstEstilos(ast);

  const resultadoSemantico = analizarEstilos(astNormalizado);
  if (!resultadoSemantico || resultadoSemantico.ok === false) {
    return {
      ok: false,
      css: '',
      errores: resultadoSemantico?.errores || ['Error en la fase semántica']
    };
  }

  const tablaSimbolos = obtenerTablaSimbolos(resultadoSemantico);
  const astLimpio = expandirForsEstilos(astNormalizado, tablaSimbolos);
  const estilosLimpios = obtenerListaEstilos(astLimpio);

  const resultadoExtiende = resolverExtiendeStyles(estilosLimpios, tablaSimbolos);
  if (!resultadoExtiende || resultadoExtiende.ok === false) {
    errores.push(...(resultadoExtiende?.errores || ['Error en la fase de extends']));
  }

  const estilosResueltos = obtenerListaEstilos(resultadoExtiende);
  const resultadoIntermedio = normalizarEstilos(estilosResueltos);
  if (!resultadoIntermedio || resultadoIntermedio.ok === false) {
    errores.push(...(resultadoIntermedio?.errores || ['Error en la fase intermedia']));
  }

  const estilosNormalizados = obtenerListaEstilos(resultadoIntermedio);
  const resultadoCss = generarCssDesdeEstilos(estilosNormalizados, opciones);

  if (resultadoCss && resultadoCss.ok === false) {
    errores.push(...(resultadoCss.errores || ['Error en la generación CSS']));
  }

  return {
    ok: errores.length === 0 && Boolean(resultadoCss?.ok),
    css: resultadoCss?.css || '',
    errores
  };
}

export { compilarEstilos };
export default compilarEstilos;