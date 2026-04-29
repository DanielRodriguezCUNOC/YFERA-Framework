// place files you want to import through the `$lib` alias in this folder.

export { compilarEstilos } from './gramatica/generador/estilos/compilar-estilos.js';
export { GeneradorCodigoIntermedio, normalizarEstilos } from './gramatica/generador/estilos/codigo-intermedio-styles.js';
export { GeneradorCSS, generarCssDesdeEstilos } from './gramatica/generador/estilos/generar-css.js';
export { ResolverExtiendeStyles, resolverExtiendeStyles } from './gramatica/generador/estilos/extends-style.js';
export { GeneradorCSS as GeneradorLimpiezaEstilos, expandirForsEstilos } from './gramatica/generador/estilos/limpiar-styles.js';
