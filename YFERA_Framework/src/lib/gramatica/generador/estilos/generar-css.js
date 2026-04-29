/*
* Esta clase se encarga de generar el codigo CSS a partir de los estilos previamente procesados en las pasadas. 
*/

class GeneradorCSS {

  constructor(estilos, opciones = {}) {
    this.estilos = Array.isArray(estilos) ? this.clonarValor(estilos) : [];
    this.errores = [];
    this.indentacion = typeof opciones.indentacion === 'string' ? opciones.indentacion : '  ';
  }

  //* Punto de entrada para generar CSS final.
  generar() {
    const bloques = [];
    let indice = 0;

    while (indice < this.estilos.length) {
      const estilo = this.estilos[indice];
      const bloque = this.generarBloqueEstilo(estilo);
      if (bloque.length > 0) {
        bloques.push(bloque);
      }
      indice += 1;
    }

    return {
      ok: this.errores.length === 0,
      css: this.unirBloques(bloques),
      errores: this.errores.slice()
    };
  }

  //* Genera un bloque CSS para un estilo.
  generarBloqueEstilo(estilo) {
    if (!estilo || typeof estilo.selector !== 'string' || estilo.selector.trim().length === 0) {
      this.registrarError('Estilo inválido: selector ausente o inválido');
      return '';
    }

    const selector = estilo.selector.trim();
    const propiedades = Array.isArray(estilo.propiedades) ? estilo.propiedades : [];
    const lineasPropiedades = this.generarLineasPropiedades(propiedades);

    const salto = '\n';
    return `${selector} {${salto}${lineasPropiedades.join(salto)}${salto}}`;
  }

  //* Genera las lineas de propiedades en formato CSS.
  generarLineasPropiedades(propiedades) {
    const lineas = [];
    let indice = 0;

    while (indice < propiedades.length) {
      const prop = propiedades[indice];
      const linea = this.generarLineaPropiedad(prop);
      if (linea.length > 0) {
        lineas.push(linea);
      }
      indice += 1;
    }

    return lineas;
  }

  //* Genera una sola linea CSS de propiedad.
  generarLineaPropiedad(propiedad) {
    if (!propiedad || typeof propiedad.propiedad !== 'string' || propiedad.propiedad.trim().length === 0) {
      this.registrarError('Propiedad inválida detectada durante la generación CSS');
      return '';
    }

    const nombre = propiedad.propiedad.trim();
    const valor = this.formatearValor(propiedad.valor);

    return `${this.indentacion}${nombre}: ${valor};`;
  }

  //* Convierte cualquier valor a string CSS.
  formatearValor(valor) {
    if (valor === null || valor === undefined) {
      return '';
    }

    if (typeof valor === 'string') {
      return valor.trim();
    }

    if (typeof valor === 'number' || typeof valor === 'boolean') {
      return String(valor);
    }

    if (Array.isArray(valor)) {
      return valor.join(' ');
    }

    this.registrarError('Valor de propiedad no reconocido, se convertirá a string');
    return String(valor);
  }

  //* Une bloques de forma legible.
  unirBloques(bloques) {
    return bloques.join('\n\n');
  }

  registrarError(mensaje) {
    this.errores.push(mensaje);
  }

  clonarValor(valor) {
    if (valor === null || typeof valor !== 'object') {
      return valor;
    }

    if (Array.isArray(valor)) {
      const arregloClonado = [];
      let indice = 0;
      while (indice < valor.length) {
        arregloClonado.push(this.clonarValor(valor[indice]));
        indice += 1;
      }
      return arregloClonado;
    }

    const objetoClonado = {};
    const llaves = Object.keys(valor);
    let indiceLlave = 0;
    while (indiceLlave < llaves.length) {
      const llave = llaves[indiceLlave];
      objetoClonado[llave] = this.clonarValor(valor[llave]);
      indiceLlave += 1;
    }
    return objetoClonado;
  }
}

function generarCssDesdeEstilos(estilos, opciones = {}) {
  const generador = new GeneradorCSS(estilos, opciones);
  return generador.generar();
}

export { GeneradorCSS, generarCssDesdeEstilos };
export default generarCssDesdeEstilos;