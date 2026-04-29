/*
* Esta es una fase intermedia que permite formalizar el contenido del AST antes de generar el codigo final que es CSS3
* Mapea propiedades y valores a CSS3 estándar
*/

class GeneradorCodigoIntermedio {

  constructor() {
    this.mapeoColores = {
      'blue': '#0000FF',
      'red': '#FF0000',
      'green': '#00AA00',
      'white': '#FFFFFF',
      'black': '#000000',
      'gray': '#808080',
      'lightgray': '#D3D3D3',
      'violet': '#EE82EE'
    };

    this.mapeoFuentes = {
      'HELVETICA': 'helvetica, sans-serif',
      'SANS': 'sans-serif',
      'SANS SERIF': 'sans-serif',
      'SERIF': 'serif',
      'MONO': 'monospace',
      'CURSIVE': 'cursive'
    };

    this.mapeoBordes = {
      'SOLID': 'solid',
      'DOTTED': 'dotted',
      'LINE': 'solid',
      'DOUBLE': 'double'
    };

    this.mapeoAlineacion = {
      'CENTER': 'center',
      'LEFT': 'left',
      'LEFT_VALUE': 'left',
      'RIGHT': 'right',
      'RIGHT_VALUE': 'right'
    };

    this.mapeoPropiedad = {
      'text-size': 'font-size',
      'text-font': 'font-family'
    };
  }

  /*
   * Entrada principal: normaliza AST de estilos resueltos
   * estilos - AST con estilos (después de resolver extends)
   */
  normalizar(estilos) {
    const errores = [];
    const estilosNormalizados = [];

    try {
      if (!Array.isArray(estilos)) {
        throw new Error('Entrada debe ser un array de estilos');
      }

      for (let estilo of estilos) {
        try {
          const normalizado = this.normalizarEstilo(estilo);
          estilosNormalizados.push(normalizado);
        } catch (error) {
          errores.push({
            tipo: 'normalizacion',
            selector: estilo?.selector || 'desconocido',
            mensaje: error.message
          });
        }
      }

      return {
        ok: errores.length === 0,
        estilos: estilosNormalizados,
        errores
      };
    } catch (error) {
      return {
        ok: false,
        estilos: [],
        errores: [{
          tipo: 'normalizacion_general',
          mensaje: error.message
        }]
      };
    }
  }

  /*
   * Normaliza un estilo individual
   * estilo - { tipo, selector, propiedades }
   */
  normalizarEstilo(estilo) {
    const propiedadesNormalizadas = [];

    for (let prop of estilo.propiedades) {
      const normalizada = this.normalizarPropiedad(prop);
      propiedadesNormalizadas.push(normalizada);
    }

    return {
      selector: estilo.selector,
      propiedades: propiedadesNormalizadas
    };
  }

  /*
   * Normaliza una propiedad individual
   * prop - { propiedad, valor }
   * Propiedad normalizada { propiedad, valor }
   */
  normalizarPropiedad(prop) {
    //* Mapear nombre de propiedad a CSS3
    let nombrePropiedad = this.mapeoPropiedad[prop.propiedad] || prop.propiedad;

    //* Normalizar el valor según el tipo de propiedad
    let valorNormalizado = this.normalizarValor(prop.valor, nombrePropiedad);

    return {
      propiedad: nombrePropiedad,
      valor: valorNormalizado
    };
  }

  /*
   * Normaliza un valor según su propiedad
   * valor - Valor del AST
   * propiedad - Nombre de la propiedad CSS
   * Valor normalizado como string CSS
   */
  normalizarValor(valor, propiedad) {
    //* Valores de alineación
    if (propiedad.includes('align')) {
      return this.normalizarAlineacion(valor);
    }

    //* Valores de fuente
    if (propiedad.includes('font')) {
      return this.normalizarFuente(valor);
    }

    //* Valores de color
    if (propiedad.includes('color')) {
      return this.normalizarColor(valor);
    }

    //* Valores de borde (estilo)
    if (propiedad.includes('border') && propiedad.includes('style')) {
      return this.normalizarEstiloBorde(valor);
    }

    //* Valores numéricos (medidas)
    if (typeof valor === 'number') {
      return this.normalizarMedida(valor);
    }

    //* Valores porcentaje
    if (typeof valor === 'object' && valor.tipo === 'porcentaje') {
      return `${valor.valor}%`;
    }

    //* Valores RGB
    if (typeof valor === 'object' && valor.tipo === 'rgb') {
      return `rgb(${valor.valor.join(', ')})`;
    }

    //* Valores hex
    if (typeof valor === 'object' && valor.tipo === 'hex') {
      return valor.valor;
    }

    //* Shorthand border (objeto con propiedades)
    if (typeof valor === 'object' && valor.ancho !== undefined) {
      return this.normalizarBordeShorthand(valor);
    }

    //* Valor string directo
    return String(valor);
  }

  /*
   * Normaliza valores de alineación (CENTER, LEFT, RIGHT)
   */
  normalizarAlineacion(valor) {
    return this.mapeoAlineacion[valor] || valor.toLowerCase();
  }

  /*
   * Normaliza valores de fuente
   */
  normalizarFuente(valor) {
    return this.mapeoFuentes[valor] || valor.toLowerCase();
  }

  /*
   * Normaliza valores de color
   */
  normalizarColor(valor) {
    //* Si es nombre de color
    if (typeof valor === 'string') {
      return this.mapeoColores[valor] || valor;
    }

    //* Si es objeto hex
    if (typeof valor === 'object' && valor.tipo === 'hex') {
      return valor.valor;
    }

    //* Si es objeto RGB
    if (typeof valor === 'object' && valor.tipo === 'rgb') {
      return `rgb(${valor.valor.join(', ')})`;
    }

    return valor;
  }

  /*
   * Normaliza valores numéricos (añade px si no tiene unidad)
   */
  normalizarMedida(valor) {
    return `${valor}px`;
  }

  /*
   * Normaliza estilos de borde
   */
  normalizarEstiloBorde(valor) {
    return this.mapeoBordes[valor] || valor.toLowerCase();
  }

  /*
   * Normaliza shorthand de border (ej: { ancho, estilo, color })
   */
  normalizarBordeShorthand(valor) {
    const partes = [];

    if (valor.ancho !== undefined) {
      partes.push(this.normalizarMedida(valor.ancho));
    }

    if (valor.estilo !== undefined) {
      partes.push(this.normalizarEstiloBorde(valor.estilo));
    }

    if (valor.color !== undefined) {
      partes.push(this.normalizarColor(valor.color));
    }

    return partes.join(' ');
  }
}

function normalizarEstilos(ast) {
  const generador = new GeneradorCodigoIntermedio();
  return generador.normalizar(ast);
}

export { GeneradorCodigoIntermedio, normalizarEstilos };
export default normalizarEstilos;