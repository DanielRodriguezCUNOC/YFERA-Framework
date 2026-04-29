/*
* Aqui Ocurre la "magia" de convertir la gramatica  de styles y quitarle los ciclos for
*/

class GeneradorCSS {

  //* Inicializa el generador con el AST de estilos
  //* ast: arreglo de sentencias del parser
  //* tablaSimbolos: lista de símbolos producida por el analizador semántico
  constructor(ast, tablaSimbolos = []) {
    this.ast = Array.isArray(ast) ? ast : [];
    this.tablaSimbolos = Array.isArray(tablaSimbolos) ? this.clonarValor(tablaSimbolos) : [];
    this.selectoresRegistrados = [];
    this.errores = [];
    this.inicializarSelectoresDesdeTabla();
  }

  //* Recorre el AST y expande todas las sentencias tipo for
  //* Retorna un nuevo AST con estilos css sin ciclos
  expandirFors() {
    const listaResultado = [];
    let indiceSentencia = 0;

    while (indiceSentencia < this.ast.length) {
      const sentenciaActual = this.ast[indiceSentencia];
      this.procesarSentenciaRaiz(sentenciaActual, listaResultado);
      indiceSentencia += 1;
    }

    return listaResultado;
  }

  //* Procesa una sentencia de nivel raíz y la agrega al resultado final
  //* sentencia: nodo del AST principal
  //* listaResultado: acumulador de estilos procesados
  procesarSentenciaRaiz(sentencia, listaResultado) {
    if (!this.esSentenciaValida(sentencia)) {
      return;
    }

    if (this.esSentenciaEstilo(sentencia)) {
      const estiloClonado = this.clonarValor(sentencia);
      this.validarExtiendeConTabla(estiloClonado.extiende, estiloClonado.selector);
      this.registrarSelectorSiEsValido(estiloClonado.selector);
      listaResultado.push(estiloClonado);
      return;
    }

    if (this.esSentenciaFor(sentencia)) {
      const estilosExpandidos = this.expandirSentenciaFor(sentencia);
      this.agregarListaResultado(listaResultado, estilosExpandidos);
    }
  }

  //* Valida si una sentencia existe y tiene estructura de objeto
  //* sentencia: elemento del AST
  esSentenciaValida(sentencia) {
    return Boolean(sentencia) && typeof sentencia === 'object';
  }

  //* Indica si la sentencia corresponde a un estilo estático
  //* sentencia: elemento del AST
  esSentenciaEstilo(sentencia) {
    return sentencia.tipo === 'estilo';
  }

  //* Indica si la sentencia corresponde a un ciclo for de estilos
  //* sentencia: elemento del AST
  esSentenciaFor(sentencia) {
    return sentencia.tipo === 'for';
  }

  //* Agrega una lista de nodos al acumulador principal
  //* listaDestino: arreglo donde se insertan nodos 
  //* listaOrigen: elementos a insertar
  agregarListaResultado(listaDestino, listaOrigen) {
    let indice = 0;
    while (indice < listaOrigen.length) {
      listaDestino.push(listaOrigen[indice]);
      indice += 1;
    }
  }

  //* Expande una sentencia for a una lista de estilos objetivos sin ciclos
  //* nodoFor: objeto con variable, desde, hasta, inclusivo y estilos
  expandirSentenciaFor(nodoFor) {
    const listaResultado = [];
    const nombreVariable = this.obtenerNombreVariableFor(nodoFor);
    const contextoVacio = {};
    const desde = this.evaluarExprNumerica(nodoFor.desde, contextoVacio, 'for.desde');
    const hasta = this.evaluarExprNumerica(nodoFor.hasta, contextoVacio, 'for.hasta');
    const estilosFor = this.obtenerListaEstilosFor(nodoFor);
    const puedeExpandir = this.puedeExpandirFor(desde, hasta, estilosFor);
    const inclusivo = nodoFor.inclusivo === true;

    if (!puedeExpandir) {
      return listaResultado;
    }

    const paso = desde <= hasta ? 1 : -1;
    let iteracion = desde;

    while (this.debeContinuar(iteracion, hasta, paso, inclusivo)) {
      const contextoIteracion = this.crearContextoIteracion(nombreVariable, iteracion);
      this.expandirEstilosIteracion(estilosFor, contextoIteracion, nombreVariable, listaResultado);

      iteracion += paso;
    }

    return listaResultado;
  }

  //* Obtiene el nombre de variable del for
  //* nodoFor: nodo del for
  obtenerNombreVariableFor(nodoFor) {
    if (typeof nodoFor.variable === 'string') {
      return nodoFor.variable;
    }
    return '';
  }

  //* Obtiene la lista de estilos del for o un arreglo vacío si no existe
  //* nodoFor: nodo del for
  obtenerListaEstilosFor(nodoFor) {
    if (Array.isArray(nodoFor.estilos)) {
      return nodoFor.estilos;
    }
    return [];
  }

  //* Valida condiciones mínimas para poder expandir un for
  //* desde: límite inferior evaluado
  //* hasta: límite superior evaluado
  //* estilosFor: lista interna de estilos del for
  puedeExpandirFor(desde, hasta, estilosFor) {
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
      return false;
    }

    if (!Number.isInteger(desde) || !Number.isInteger(hasta)) {
      this.registrarError('Los limites del for deben ser enteros');
      return false;
    }

    if (!Array.isArray(estilosFor) || estilosFor.length === 0) {
      this.registrarError('El for debe contener una lista de estilos');
      return false;
    }

    return true;
  }

  //* Crea el contexto de variables para una iteración concreta del for. Como un diccionario con el nombre de la variable y su valor actual.
  //* nombreVariable: identificador de variable del for
  //* valorIteracion: valor numérico actual
  crearContextoIteracion(nombreVariable, valorIteracion) {
    const contexto = {};
    if (nombreVariable.length > 0) {
      contexto[nombreVariable] = valorIteracion;
    }
    return contexto;
  }

  //* Instancia todos los estilos de una iteración y los agrega al resultado
  //* estilosFor: lista base definida dentro del for
  //* contexto: variables disponibles para la iteración
  //* nombreVariable: variable del for
  //* listaResultado: acumulador final de estilos
  expandirEstilosIteracion(estilosFor, contexto, nombreVariable, listaResultado) {
    let indiceEstilo = 0;
    while (indiceEstilo < estilosFor.length) {
      const estiloFor = estilosFor[indiceEstilo];
      const estiloInstanciado = this.instanciarEstiloFor(estiloFor, contexto, nombreVariable);
      if (estiloInstanciado !== null) {
        listaResultado.push(estiloInstanciado);
      }
      indiceEstilo += 1;
    }
  }

  //* Determina si el for debe continuar 
  //* valorActual: valor de la iteración actual
  //* limite: valor final del rango.
  //* paso: 1 o -1
  //* inclusivo: true para incluir el límite, false para excluirlo
  debeContinuar(valorActual, limite, paso, inclusivo) {
    if (paso > 0) {
      if (inclusivo) {
        return valorActual <= limite;
      }
      return valorActual < limite;
    }

    if (inclusivo) {
      return valorActual >= limite;
    }
    return valorActual > limite;
  }

  //* Crea un estilo concreto a partir de un estilo definido dentro de un for
  //* estiloFor: nodo de estilo dentro del for
  //* contexto: mapa con la variable del for y su valor actual
  //* variableFor: nombre de la variable del for (por ejemplo "$i")
  instanciarEstiloFor(estiloFor, contexto, variableFor) {
    if (!estiloFor || estiloFor.tipo !== 'estilo') {
      this.registrarError('Nodo invalido dentro de for');
      return null;
    }

    const selectorOriginal = typeof estiloFor.selector === 'string' ? estiloFor.selector : '';
    const valorVariable = this.obtenerValorVariable(contexto, variableFor);
    const selector = this.reemplazarVariableEnTexto(selectorOriginal, variableFor, valorVariable);

    let extiende = null;
    if (typeof estiloFor.extiende === 'string') {
      extiende = this.reemplazarVariableEnTexto(estiloFor.extiende, variableFor, valorVariable);
    }

    this.validarExtiendeConTabla(extiende, selector);
    this.registrarSelectorSiEsValido(selector);

    const propiedades = [];
    if (Array.isArray(estiloFor.propiedades)) {
      let indicePropiedad = 0;
      while (indicePropiedad < estiloFor.propiedades.length) {
        const propiedadOriginal = estiloFor.propiedades[indicePropiedad];
        const propiedadInstanciada = this.instanciarPropiedadFor(propiedadOriginal, contexto, variableFor);
        if (propiedadInstanciada) {
          propiedades.push(propiedadInstanciada);
        }
        indicePropiedad += 1;
      }
    }

    return {
      tipo: 'estilo',
      selector,
      extiende,
      propiedades
    };
  }

  //* Crea una propiedad concreta evaluando su valor contra el contexto del for
  //* propiedad: objeto con nombre y valor del AST
  //* contexto: mapa con valores de variables
  //* variableFor: variable permitida en el for
  instanciarPropiedadFor(propiedad, contexto, variableFor) {
    if (!propiedad || typeof propiedad.propiedad !== 'string') {
      this.registrarError('Propiedad invalida dentro de for');
      return null;
    }

    const valor = this.resolverValorFor(propiedad.valor, contexto, variableFor);
    return {
      propiedad: propiedad.propiedad,
      valor
    };
  }

  //* Resuelve el valor de una propiedad dentro del for.
  //* Soporta números, variables, expresiones, porcentaje y rgb.
  //* valor: estructura del AST para el valor.
  //* contexto: variables disponibles en la iteración.
  //* variableFor: nombre de variable permitida.
  resolverValorFor(valor, contexto, variableFor) {
    if (typeof valor === 'number') {
      return valor;
    }

    if (typeof valor === 'string') {
      const valorVariable = this.obtenerValorVariable(contexto, variableFor);
      if (valor === variableFor && Number.isFinite(valorVariable)) {
        return valorVariable;
      }
      return valor;
    }

    if (!valor || typeof valor !== 'object') {
      return valor;
    }

    if (valor.op) {
      return this.evaluarExprNumerica(valor, contexto, 'for.expresion');
    }

    if (valor.tipo === 'porcentaje') {
      return {
        tipo: 'porcentaje',
        valor: this.resolverValorFor(valor.valor, contexto, variableFor)
      };
    }

    if (valor.tipo === 'rgb' && Array.isArray(valor.valor)) {
      const componentes = [];
      let indice = 0;
      while (indice < valor.valor.length) {
        componentes.push(this.resolverValorFor(valor.valor[indice], contexto, variableFor));
        indice += 1;
      }
      return {
        tipo: 'rgb',
        valor: componentes
      };
    }

    return this.clonarValor(valor);
  }

  //* Evalúa una expresión numérica del AST
  //* expr: número, variable o nodo de expresión
  //* contexto: mapa de variables para resolver identificadores
  //* contextoError: texto para reportar errores con más detalle
  evaluarExprNumerica(expr, contexto, contextoError) {
    if (typeof expr === 'number') {
      return expr;
    }

    if (typeof expr === 'string') {
      if (contexto[expr] !== undefined) {
        return contexto[expr];
      }
      return this.registrarError(`Variable no definida en ${contextoError}: ${expr}`);
    }

    if (!expr || typeof expr !== 'object' || !expr.op) {
      return this.registrarError(`Expresion invalida en ${contextoError}`);
    }

    const izquierda = this.evaluarExprNumerica(expr.left, contexto, contextoError);
    const derecha = this.evaluarExprNumerica(expr.right, contexto, contextoError);

    if (!Number.isFinite(izquierda) || !Number.isFinite(derecha)) {
      return NaN;
    }

    if (expr.op === '+') {
      return izquierda + derecha;
    }
    if (expr.op === '-') {
      return izquierda - derecha;
    }
    if (expr.op === '*') {
      return izquierda * derecha;
    }

    if (expr.op === '/') {
      if (derecha === 0) {
        return this.registrarError(`Division entre cero en ${contextoError}`);
      }
      return izquierda / derecha;
    }

    if (expr.op === '%') {
      if (derecha === 0) {
        return this.registrarError(`Modulo entre cero en ${contextoError}`);
      }
      return izquierda % derecha;
    }

    return this.registrarError(`Operador no soportado en ${contextoError}: ${String(expr.op)}`);
  }

  //* Reemplaza la variable en un texto por su valor actual de iteración
  //* texto: selector u otra cadena donde puede aparecer la variable
  //* variable: nombre de variable a reemplazar
  //* valor: número a insertar en el texto
  reemplazarVariableEnTexto(texto, variable, valor) {
    if (typeof texto !== 'string') {
      return '';
    }
    if (typeof variable !== 'string' || variable.length === 0) {
      return texto;
    }
    if (!Number.isFinite(valor)) {
      return texto;
    }

    return texto.split(variable).join(String(valor));
  }

  //* Clona recursivamente un valor
  //* valor: elemento del AST que se desea copiar
  clonarValor(valor) {
    if (valor === null || typeof valor !== 'object') {
      return valor;
    }

    if (Array.isArray(valor)) {
      const copiaArreglo = [];
      let indice = 0;
      while (indice < valor.length) {
        copiaArreglo.push(this.clonarValor(valor[indice]));
        indice += 1;
      }
      return copiaArreglo;
    }

    const copiaObjeto = {};
    const llaves = Object.keys(valor);
    let indiceLlave = 0;
    while (indiceLlave < llaves.length) {
      const llave = llaves[indiceLlave];
      copiaObjeto[llave] = this.clonarValor(valor[llave]);
      indiceLlave += 1;
    }
    return copiaObjeto;
  }

  //* Busca el valor numérico de una variable dentro del contexto actual.
  //* Retorna NaN cuando la variable no existe o no es válida.
  obtenerValorVariable(contexto, nombreVariable) {
    if (!contexto || typeof contexto !== 'object') {
      return NaN;
    }
    if (typeof nombreVariable !== 'string' || nombreVariable.length === 0) {
      return NaN;
    }
    if (contexto[nombreVariable] === undefined) {
      return NaN;
    }

    const valor = contexto[nombreVariable];
    if (!Number.isFinite(valor)) {
      return NaN;
    }

    return valor;
  }

  //* Registra errores de generación
  //* mensaje: texto del error que se guardará
  registrarError(mensaje) {
    this.errores.push(mensaje);
    throw new Error(mensaje);
  }

  //* Inicializa una lista local de selectores desde la tabla recibida de semántica.
  inicializarSelectoresDesdeTabla() {
    let indice = 0;
    while (indice < this.tablaSimbolos.length) {
      const simbolo = this.tablaSimbolos[indice];
      if (simbolo && simbolo.tipo === 'selector' && typeof simbolo.nombre === 'string' && simbolo.nombre.length > 0) {
        this.registrarSelectorLocal(simbolo.nombre);
      }
      indice += 1;
    }
  }

  //* Valida que el selector base de extiende exista en tabla o en selectores generados.
  //* extiende: nombre del selector base.
  //* selectorActual: selector del estilo que está siendo procesado.
  validarExtiendeConTabla(extiende, selectorActual) {
    if (typeof extiende !== 'string' || extiende.length === 0) {
      return;
    }

    if (extiende === selectorActual) {
      this.registrarError(`Un estilo no puede extenderse a sí mismo: ${selectorActual}`);
      return;
    }

    const existeBase = this.existeSelectorRegistrado(extiende);
    if (!existeBase) {
      this.registrarError(`El selector base no existe para extiende: ${extiende}`);
    }
  }

  //* Registra selector en memoria local y en tabla para permitir referencias posteriores.
  //* selector: nombre de selector a registrar.
  registrarSelectorSiEsValido(selector) {
    if (typeof selector !== 'string' || selector.length === 0) {
      return;
    }

    if (!this.existeSelectorRegistrado(selector)) {
      this.registrarSelectorLocal(selector);
      this.tablaSimbolos.push({ nombre: selector, tipo: 'selector', ambito: 'global' });
    }
  }

  //* Verifica si un selector ya está disponible para referencias de extiende.
  //* nombreSelector: selector a buscar.
  existeSelectorRegistrado(nombreSelector) {
    let indice = 0;
    while (indice < this.selectoresRegistrados.length) {
      if (this.selectoresRegistrados[indice] === nombreSelector) {
        return true;
      }
      indice += 1;
    }
    return false;
  }

  //* Registra un selector en la lista local evitando duplicados.
  //* nombreSelector: selector a agregar.
  registrarSelectorLocal(nombreSelector) {
    if (!this.existeSelectorRegistrado(nombreSelector)) {
      this.selectoresRegistrados.push(nombreSelector);
    }
  }

  //* Retorna una copia de los errores registrados por el generador.
  obtenerErrores() {
    return this.errores.slice();
  }

  //* Retorna una copia de la tabla de símbolos recibida desde semántica.
  obtenerTablaSimbolos() {
    return this.clonarValor(this.tablaSimbolos);
  }

  //* Punto de entrada de generación (por ahora solo expande for).
  generar() {
    return this.expandirFors();
  }
}

//* Atajo funcional para usar el generador sin instanciar manualmente la clase
//* ast: arreglo de sentencias del parser
//* tablaSimbolos: lista de símbolos producida por el analizador semántico
function expandirForsEstilos(ast, tablaSimbolos = []) {
  const generador = new GeneradorCSS(ast, tablaSimbolos);
  return generador.expandirFors();
}

export { GeneradorCSS, expandirForsEstilos };
export default expandirForsEstilos;
