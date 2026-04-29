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

function compilarEstilos(ast, opciones = {}) {
  const errores = [];

  const resultadoSemantico = analizarEstilos(ast);
  if (!resultadoSemantico || resultadoSemantico.ok === false) {
    return {
      ok: false,
      css: '',
      errores: resultadoSemantico?.errores || ['Error en la fase semántica']
    };
  }

  const tablaSimbolos = obtenerTablaSimbolos(resultadoSemantico);
  const astLimpio = expandirForsEstilos(ast, tablaSimbolos);
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