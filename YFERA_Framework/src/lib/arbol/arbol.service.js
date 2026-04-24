import {
	initialProject,
	initialTree,
	defaultActiveNodeId,
} from "./arbol.state.js";
import { CLAVE_ESTADO_INTERFAZ, TIPO_NODO } from "./arbol.types.js";
import {
	compactarArbol,
	construirArbol,
	buscarNodoPlanoPorId,
	obtenerIdsDescendientes,
	obtenerPrimerNodoArchivo,
	obtenerExtensionArchivo,
} from "./arbol.selector.js";
import {
	abrirBaseDatosArbol,
	borrarEstadoInterfazPorProyecto,
	borrarPestanasPorProyecto,
	borrarProyecto,
	contarProyectos,
	guardarEstadoInterfaz,
	guardarNodos,
	guardarPestanas,
	guardarProyecto,
	obtenerEstadoInterfazPorProyecto,
	obtenerNodosPorProyecto,
	obtenerPestanasPorProyecto,
	obtenerProyectoMasReciente,
	obtenerProyectoPorId,
} from "./arbol.repository.js";

function crearProyectoInicial() {
	const fechaActual = Date.now();

	return {
		id: initialProject.id,
		nombre: initialProject.name,
		creadoEn: fechaActual,
		actualizadoEn: fechaActual,
		ultimoAcceso: fechaActual,
	};
}

function crearEstadoInterfazInicial(proyectoId, nodoActivoId) {
	return {
		id: `${CLAVE_ESTADO_INTERFAZ}-${proyectoId}`,
		proyectoId,
		nodoActivoId,
		actualizadoEn: Date.now(),
	};
}

function crearPestanaInicial(proyectoId, nodoId, orden) {
	return {
		id: `pestana-${proyectoId}-${nodoId}`,
		proyectoId,
		nodoId,
		orden,
		fijada: false,
	};
}

async function iniciarProyectoInicial(proyecto) {
	const nodosPlano = compactarArbol(initialTree, proyecto.id);
	const estadoInterfaz = crearEstadoInterfazInicial(proyecto.id, defaultActiveNodeId);
	const pestanaInicial = crearPestanaInicial(proyecto.id, defaultActiveNodeId, 0);
	const arbol = construirArbol(nodosPlano);

	await guardarProyecto(proyecto);
	await guardarNodos(nodosPlano);
	await guardarEstadoInterfaz(estadoInterfaz);
	await guardarPestanas([pestanaInicial]);

	return {
		proyecto,
		nodosPlano,
		arbol,
		estadoInterfaz,
		pestanas: [pestanaInicial],
	};
}

function generarIdentificadorNodo(tipo) {
	const prefijo = tipo === TIPO_NODO.CARPETA ? "folder" : "file";
	const id = `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
	return id;
}

function obtenerSiguienteOrdenDeHijos(nodosPlano, proyectoId, padreId) {
	let maximoOrden = -1;
	let indice = 0;

	while (indice < nodosPlano.length) {
		const nodo = nodosPlano[indice];
		if (nodo.proyectoId === proyectoId && nodo.padreId === padreId) {
			if (nodo.orden > maximoOrden) {
				maximoOrden = nodo.orden;
			}
		}
		indice += 1;
	}

	return maximoOrden + 1;
}

function existeNombreEnMismoPadre(nodosPlano, proyectoId, padreId, nombre) {
	const nombreLimpio = nombre.trim().toLowerCase();
	let indice = 0;

	while (indice < nodosPlano.length) {
		const nodo = nodosPlano[indice];
		if (nodo.proyectoId === proyectoId && nodo.padreId === padreId) {
			if (nodo.nombre.trim().toLowerCase() === nombreLimpio) {
				return true;
			}
		}
		indice += 1;
	}

	return false;
}

function crearNodoPlanoBase(proyectoId, padreId, tipo, nombre, contenido = "") {
	return {
		id: generarIdentificadorNodo(tipo),
		proyectoId,
		padreId,
		tipo,
		nombre,
		extension: tipo === TIPO_NODO.CARPETA ? "" : obtenerExtensionArchivo(nombre),
		orden: 0,
		contenido: tipo === TIPO_NODO.CARPETA ? "" : contenido,
		actualizadoEn: Date.now(),
	};
}

async function guardarMarcaDeProyecto(proyectoId) {
	const proyecto = await obtenerProyectoPorId(proyectoId);
	if (!proyecto) {
		return;
	}

	const fechaActual = Date.now();
	proyecto.actualizadoEn = fechaActual;
	proyecto.ultimoAcceso = fechaActual;
	await guardarProyecto(proyecto);
}

function buscarNodoPlanoEnLista(nodosPlano, nodoId) {
	let indice = 0;
	while (indice < nodosPlano.length) {
		const nodoPlano = nodosPlano[indice];
		if (nodoPlano.id === nodoId) {
			return nodoPlano;
		}
		indice += 1;
	}

	return null;
}

function existeNombreHermano(nodosPlano, proyectoId, padreId, nombre, nodoIdIgnorado) {
	const nombreBuscado = nombre.trim().toLowerCase();
	let indice = 0;

	while (indice < nodosPlano.length) {
		const nodoPlano = nodosPlano[indice];
		if (
			nodoPlano.proyectoId === proyectoId &&
			nodoPlano.padreId === padreId &&
			nodoPlano.id !== nodoIdIgnorado &&
			nodoPlano.nombre.trim().toLowerCase() === nombreBuscado
		) {
			return true;
		}
		indice += 1;
	}

	return false;
}

export async function crearCarpeta(proyectoId, padreId, nombreCarpeta) {
	const nombre = nombreCarpeta.trim();
	if (!nombre) {
		throw new Error("El nombre de carpeta es obligatorio.");
	}

	const nodosPlano = await obtenerNodosPorProyecto(proyectoId);
	if (existeNombreEnMismoPadre(nodosPlano, proyectoId, padreId, nombre)) {
		throw new Error("Ya existe un nodo con ese nombre en esta carpeta.");
	}

	const nodoNuevo = crearNodoPlanoBase(
		proyectoId,
		padreId,
		TIPO_NODO.CARPETA,
		nombre,
	);
	nodoNuevo.orden = obtenerSiguienteOrdenDeHijos(nodosPlano, proyectoId, padreId);

	await guardarNodos([nodoNuevo]);
	await guardarMarcaDeProyecto(proyectoId);

	const nodosActualizados = await obtenerNodosPorProyecto(proyectoId);
	const arbol = construirArbol(nodosActualizados);

	return {
		nodoNuevo,
		nodosPlano: nodosActualizados,
		arbol,
	};
}

export async function crearArchivo(proyectoId, padreId, nombreArchivo, contenidoInicial = "") {
	const nombre = nombreArchivo.trim();
	if (!nombre) {
		throw new Error("El nombre de archivo es obligatorio.");
	}

	const nodosPlano = await obtenerNodosPorProyecto(proyectoId);
	if (existeNombreEnMismoPadre(nodosPlano, proyectoId, padreId, nombre)) {
		throw new Error("Ya existe un nodo con ese nombre en esta carpeta.");
	}

	const nodoNuevo = crearNodoPlanoBase(
		proyectoId,
		padreId,
		TIPO_NODO.ARCHIVO,
		nombre,
		contenidoInicial,
	);
	nodoNuevo.orden = obtenerSiguienteOrdenDeHijos(nodosPlano, proyectoId, padreId);

	await guardarNodos([nodoNuevo]);
	await guardarMarcaDeProyecto(proyectoId);

	const nodosActualizados = await obtenerNodosPorProyecto(proyectoId);
	const arbol = construirArbol(nodosActualizados);

	return {
		nodoNuevo,
		nodosPlano: nodosActualizados,
		arbol,
	};
}

export async function renombrarNodo(proyectoId, nodoId, nuevoNombre) {
	const nombre = nuevoNombre.trim();
	if (!nombre) {
		throw new Error("El nombre es obligatorio.");
	}

	const nodosPlano = await obtenerNodosPorProyecto(proyectoId);
	const nodoEncontrado = buscarNodoPlanoEnLista(nodosPlano, nodoId);
	if (!nodoEncontrado) {
		throw new Error("No se encontro el nodo a renombrar.");
	}

	if (existeNombreHermano(nodosPlano, proyectoId, nodoEncontrado.padreId, nombre, nodoId)) {
		throw new Error("Ya existe otro nodo con ese nombre en esta carpeta.");
	}

	nodoEncontrado.nombre = nombre;
	if (nodoEncontrado.tipo === TIPO_NODO.ARCHIVO) {
		nodoEncontrado.extension = obtenerExtensionArchivo(nombre);
	}
	nodoEncontrado.actualizadoEn = Date.now();

	await guardarNodo(nodoEncontrado);
	await guardarMarcaDeProyecto(proyectoId);

	const nodosActualizados = await obtenerNodosPorProyecto(proyectoId);
	const arbol = construirArbol(nodosActualizados);

	return {
		nodoActualizado: nodoEncontrado,
		nodosPlano: nodosActualizados,
		arbol,
	};
}

export async function eliminarNodo(proyectoId, nodoId) {
	const nodosPlano = await obtenerNodosPorProyecto(proyectoId);
	const nodoEncontrado = buscarNodoPlanoEnLista(nodosPlano, nodoId);
	if (!nodoEncontrado) {
		throw new Error("No se encontro el nodo a eliminar.");
	}

	if (nodoEncontrado.padreId === null) {
		throw new Error("No se puede eliminar la carpeta raiz del proyecto.");
	}

	const idsDescendientes = obtenerIdsDescendientes(nodosPlano, nodoId);
	const idsAEliminar = [nodoId];
	let indice = 0;
	while (indice < idsDescendientes.length) {
		idsAEliminar.push(idsDescendientes[indice]);
		indice += 1;
	}

	await borrarNodosPorIds(idsAEliminar);

	const pestanas = await obtenerPestanasPorProyecto(proyectoId);
	const pestanasActualizadas = [];
	indice = 0;
	while (indice < pestanas.length) {
		let sigue = true;
		let indiceEliminado = 0;
		while (indiceEliminado < idsAEliminar.length) {
			if (pestanas[indice].nodoId === idsAEliminar[indiceEliminado]) {
				sigue = false;
				break;
			}
			indiceEliminado += 1;
		}

		if (sigue) {
			pestanasActualizadas.push(pestanas[indice]);
		}
		indice += 1;
	}

	await borrarPestanasPorProyecto(proyectoId);
	if (pestanasActualizadas.length > 0) {
		await guardarPestanas(pestanasActualizadas);
	}

	const nodosRestantes = await obtenerNodosPorProyecto(proyectoId);
	const arbol = construirArbol(nodosRestantes);
	let nodoActivoId = null;
	if (pestanasActualizadas.length > 0) {
		nodoActivoId = pestanasActualizadas[0].nodoId;
	} else {
		const primerArchivo = obtenerPrimerNodoArchivo(arbol);
		nodoActivoId = primerArchivo ? primerArchivo.id : null;
	}

	await guardarEstadoDeInterfaz({
		id: `${CLAVE_ESTADO_INTERFAZ}-${proyectoId}`,
		proyectoId,
		nodoActivoId,
		actualizadoEn: Date.now(),
	});
	await guardarMarcaDeProyecto(proyectoId);

	return {
		nodosPlano: nodosRestantes,
		arbol,
		pestanas: pestanasActualizadas,
		nodoActivoId,
		idsEliminados: idsAEliminar,
	};
}

export async function cargarArbolPersistido() {
	await abrirBaseDatosArbol();

	let proyecto = await obtenerProyectoMasReciente();
	if (!proyecto) {
		proyecto = crearProyectoInicial();
		return await iniciarProyectoInicial(proyecto);
	}

	let nodosPlano = await obtenerNodosPorProyecto(proyecto.id);
	if (nodosPlano.length === 0) {
		return await iniciarProyectoInicial(proyecto);
	}

	let estadoInterfaz = await obtenerEstadoInterfazPorProyecto(proyecto.id);
	let pestanas = await obtenerPestanasPorProyecto(proyecto.id);

	if (!estadoInterfaz) {
		const nodoInicial = buscarNodoPlanoPorId(nodosPlano, defaultActiveNodeId);
		const nodoActivoId = nodoInicial ? nodoInicial.id : null;
		estadoInterfaz = crearEstadoInterfazInicial(proyecto.id, nodoActivoId);
		await guardarEstadoInterfaz(estadoInterfaz);
	}

	if (pestanas.length === 0) {
		const pestanaInicial = crearPestanaInicial(
			proyecto.id,
			estadoInterfaz.nodoActivoId,
			0,
		);
		pestanas = [pestanaInicial];
		await guardarPestanas(pestanas);
	}

	const arbol = construirArbol(nodosPlano);

	return {
		proyecto,
		nodosPlano,
		arbol,
		estadoInterfaz,
		pestanas,
	};
}

export async function guardarContenidoArchivo(proyectoId, nodoId, contenido) {
	const nodosPlano = await obtenerNodosPorProyecto(proyectoId);
	let nodoEncontrado = null;

	let indice = 0;
	while (indice < nodosPlano.length) {
		const nodoPlano = nodosPlano[indice];
		if (nodoPlano.id === nodoId && nodoPlano.tipo === TIPO_NODO.ARCHIVO) {
			nodoEncontrado = nodoPlano;
			break;
		}
		indice += 1;
	}

	if (!nodoEncontrado) {
		return null;
	}

	nodoEncontrado.contenido = contenido;
	nodoEncontrado.actualizadoEn = Date.now();
	await guardarNodos([nodoEncontrado]);

	const proyecto = await obtenerProyectoPorId(proyectoId);
	if (proyecto) {
		proyecto.actualizadoEn = Date.now();
		proyecto.ultimoAcceso = Date.now();
		await guardarProyecto(proyecto);
	}

	return nodoEncontrado;
}

export async function guardarEstadoDeInterfaz(proyectoId, nodoActivoId, idsPestanas) {
	const fechaActual = Date.now();
	const estadoInterfaz = {
		id: `${CLAVE_ESTADO_INTERFAZ}-${proyectoId}`,
		proyectoId,
		nodoActivoId,
		actualizadoEn: fechaActual,
	};

	const pestanas = [];
	let indice = 0;
	while (indice < idsPestanas.length) {
		pestanas.push({
			id: `pestana-${proyectoId}-${idsPestanas[indice]}`,
			proyectoId,
			nodoId: idsPestanas[indice],
			orden: indice,
			fijada: false,
		});
		indice += 1;
	}

	await guardarEstadoInterfaz(estadoInterfaz);
	await borrarPestanasPorProyecto(proyectoId);
	if (pestanas.length > 0) {
		await guardarPestanas(pestanas);
	}

	const proyecto = await obtenerProyectoPorId(proyectoId);
	if (proyecto) {
		proyecto.actualizadoEn = fechaActual;
		proyecto.ultimoAcceso = fechaActual;
		await guardarProyecto(proyecto);
	}

	return {
		estadoInterfaz,
		pestanas,
	};
}

export async function asegurarProyectoInicial() {
	const cantidad = await contarProyectos();
	if (cantidad > 0) {
		return await obtenerProyectoMasReciente();
	}

	const proyecto = crearProyectoInicial();
	const resultado = await iniciarProyectoInicial(proyecto);
	return resultado.proyecto;
}

export async function reiniciarProyectoInicial(proyectoId) {
	await borrarPestanasPorProyecto(proyectoId);
	await borrarEstadoInterfazPorProyecto(proyectoId);
	await borrarProyecto(proyectoId);
	const proyecto = crearProyectoInicial();
	return await iniciarProyectoInicial(proyecto);
}
