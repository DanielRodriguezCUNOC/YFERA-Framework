/*
*Esta clase se encarga de fusionar propiedades del padre al hijo, precedencia, resolver herencia y tambien ve ciclos de herencia que sea han identificado en la pasada de limpieza
*/ 

class ResolverExtiendeStyles {

	//* Recibe estilos limpios y la tabla de símbolos.
	//* estilos: AST plano con nodos tipo estilo.
	//* tablaSimbolos: tabla generada en la fase semántica/limpieza.
	constructor(estilos, tablaSimbolos = []) {
		this.estilos = Array.isArray(estilos) ? this.clonarValor(estilos) : [];
		this.tablaSimbolos = Array.isArray(tablaSimbolos) ? this.clonarValor(tablaSimbolos) : [];
		this.errores = [];
		this.estados = [];
		this.cacheEstilosResueltos = [];
	}

	//* Punto de entrada de resolución de herencia.
	//* Retorna estilos con extiende resuelto y propiedades fusionadas.
	resolver() {
		const resultado = [];
		const estilosValidos = this.obtenerListaEstilosValidos();

		let indice = 0;
		while (indice < estilosValidos.length) {
			const estiloActual = estilosValidos[indice];
			const estiloResuelto = this.resolverEstiloPorSelector(estiloActual.selector);
			resultado.push(estiloResuelto);
			indice += 1;
		}

		return {
			ok: this.errores.length === 0,
			estilos: resultado,
			errores: this.errores.slice()
		};
	}

	//* Filtra y clona solo nodos tipo estilo.
	obtenerListaEstilosValidos() {
		const lista = [];
		let indice = 0;
		while (indice < this.estilos.length) {
			const nodo = this.estilos[indice];
			if (nodo && nodo.tipo === 'estilo' && typeof nodo.selector === 'string') {
				lista.push(nodo);
			}
			indice += 1;
		}
		return lista;
	}

	//* Resuelve un estilo por su selector, con cache y detección de ciclos.
	//* selector: nombre del selector a resolver.
	resolverEstiloPorSelector(selector) {
		const cache = this.buscarEnCache(selector);
		if (cache !== null) {
			return this.clonarValor(cache);
		}

		const estadoActual = this.obtenerEstado(selector);
		if (estadoActual === 'procesando') {
			this.registrarError(`Ciclo de herencia detectado en selector: ${selector}`);
			return this.crearEstiloFallback(selector);
		}

		this.asignarEstado(selector, 'procesando');

		const estiloOriginal = this.buscarEstiloPorSelector(selector);
		if (estiloOriginal === null) {
			this.registrarError(`No se encontró el estilo para resolver: ${selector}`);
			this.asignarEstado(selector, 'resuelto');
			const fallback = this.crearEstiloFallback(selector);
			this.guardarEnCache(fallback);
			return fallback;
		}

		const estiloResuelto = this.resolverEstiloDesdeNodo(estiloOriginal);
		this.asignarEstado(selector, 'resuelto');
		this.guardarEnCache(estiloResuelto);

		return this.clonarValor(estiloResuelto);
	}

	//* Resuelve un nodo estilo combinando sus propiedades con su base.
	//* estilo: nodo estilo original.
	resolverEstiloDesdeNodo(estilo) {
		let propiedadesResueltas = this.obtenerPropiedadesSeguras(estilo.propiedades);

		if (typeof estilo.extiende === 'string' && estilo.extiende.length > 0) {
			const selectorBase = estilo.extiende;

			if (!this.existeSelectorEnTabla(selectorBase)) {
				this.registrarError(`El selector base no está en la tabla de símbolos: ${selectorBase}`);
			}

			const estiloBaseResuelto = this.resolverEstiloPorSelector(selectorBase);
			propiedadesResueltas = this.fusionarPropiedades(estiloBaseResuelto.propiedades, propiedadesResueltas);
		}

		return {
			tipo: 'estilo',
			selector: estilo.selector,
			extiende: null,
			propiedades: propiedadesResueltas
		};
	}

	//* Busca un estilo por selector en la lista original.
	//* selector: nombre del estilo a buscar.
	buscarEstiloPorSelector(selector) {
		let indice = 0;
		while (indice < this.estilos.length) {
			const estilo = this.estilos[indice];
			if (estilo && estilo.tipo === 'estilo' && estilo.selector === selector) {
				return estilo;
			}
			indice += 1;
		}
		return null;
	}

	//* Verifica si un selector existe en la tabla de símbolos.
	//* selector: identificador del selector base.
	existeSelectorEnTabla(selector) {
		let indice = 0;
		while (indice < this.tablaSimbolos.length) {
			const simbolo = this.tablaSimbolos[indice];
			if (simbolo && simbolo.tipo === 'selector' && simbolo.nombre === selector) {
				return true;
			}
			indice += 1;
		}
		return false;
	}

	//* Obtiene lista de propiedades válida o arreglo vacío.
	//* propiedades: arreglo de propiedades del estilo.
	obtenerPropiedadesSeguras(propiedades) {
		if (!Array.isArray(propiedades)) {
			return [];
		}
		return this.clonarValor(propiedades);
	}

	//* Fusiona propiedades con precedencia del hijo.
	//* propiedadesPadre: lista del estilo base.
	//* propiedadesHijo: lista del estilo derivado.
	fusionarPropiedades(propiedadesPadre, propiedadesHijo) {
		const resultado = this.clonarValor(propiedadesPadre);

		let indiceHijo = 0;
		while (indiceHijo < propiedadesHijo.length) {
			const propHija = propiedadesHijo[indiceHijo];
			this.aplicarPropiedadConPrecedencia(resultado, propHija);
			indiceHijo += 1;
		}

		return resultado;
	}

	//* Inserta o reemplaza una propiedad en la lista destino.
	//* listaDestino: arreglo acumulado de propiedades.
	//* propiedadNueva: propiedad del hijo que puede sobrescribir.
	aplicarPropiedadConPrecedencia(listaDestino, propiedadNueva) {
		if (!propiedadNueva || typeof propiedadNueva.propiedad !== 'string') {
			return;
		}

		let indice = 0;
		while (indice < listaDestino.length) {
			const propiedadActual = listaDestino[indice];
			if (propiedadActual && propiedadActual.propiedad === propiedadNueva.propiedad) {
				listaDestino[indice] = this.clonarValor(propiedadNueva);
				return;
			}
			indice += 1;
		}

		listaDestino.push(this.clonarValor(propiedadNueva));
	}

	//* Obtiene estado de resolución para un selector.
	//* selector: nombre del selector.
	obtenerEstado(selector) {
		let indice = 0;
		while (indice < this.estados.length) {
			const entrada = this.estados[indice];
			if (entrada.selector === selector) {
				return entrada.estado;
			}
			indice += 1;
		}
		return null;
	}

	//* Asigna estado de resolución (procesando/resuelto).
	//* selector: nombre del selector.
	//* estado: estado nuevo.
	asignarEstado(selector, estado) {
		let indice = 0;
		while (indice < this.estados.length) {
			const entrada = this.estados[indice];
			if (entrada.selector === selector) {
				entrada.estado = estado;
				return;
			}
			indice += 1;
		}

		this.estados.push({ selector, estado });
	}

	//* Busca un estilo resuelto en cache.
	//* selector: nombre del selector.
	buscarEnCache(selector) {
		let indice = 0;
		while (indice < this.cacheEstilosResueltos.length) {
			const entrada = this.cacheEstilosResueltos[indice];
			if (entrada.selector === selector) {
				return entrada.estilo;
			}
			indice += 1;
		}
		return null;
	}

	//* Guarda un estilo resuelto en cache.
	//* estilo: nodo estilo con herencia resuelta.
	guardarEnCache(estilo) {
		this.cacheEstilosResueltos.push({
			selector: estilo.selector,
			estilo: this.clonarValor(estilo)
		});
	}

	//* Crea un estilo mínimo para continuar flujo cuando hay error.
	//* selector: nombre del selector del fallback.
	crearEstiloFallback(selector) {
		return {
			tipo: 'estilo',
			selector,
			extiende: null,
			propiedades: []
		};
	}

	//* Registra un error de resolución.
	//* mensaje: descripción del error.
	registrarError(mensaje) {
		this.errores.push(mensaje);
	}

	//* Clona primitvos, arreglos y objetos de forma recursiva.
	//* valor: dato a clonar.
	clonarValor(valor) {
		if (valor === null || typeof valor !== 'object') {
			return valor;
		}

		if (Array.isArray(valor)) {
			const copiaArreglo = [];
			let indiceArreglo = 0;
			while (indiceArreglo < valor.length) {
				copiaArreglo.push(this.clonarValor(valor[indiceArreglo]));
				indiceArreglo += 1;
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
}

//* Atajo funcional para resolver herencia de estilos.
//* estilos: AST limpio y expandido.
//* tablaSimbolos: símbolos disponibles para validar referencias.
function resolverExtiendeStyles(estilos, tablaSimbolos = []) {
	const resolvedor = new ResolverExtiendeStyles(estilos, tablaSimbolos);
	return resolvedor.resolver();
}

export { ResolverExtiendeStyles, resolverExtiendeStyles };
export default resolverExtiendeStyles;


