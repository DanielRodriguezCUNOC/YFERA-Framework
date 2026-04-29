import { TIPO_NODO } from "./arbol.types.js";

export function obtenerExtensionArchivo(nombreArchivo) {
	const posicionPunto = nombreArchivo.lastIndexOf(".");
	if (posicionPunto <= 0) {
		return "";
	}

	return nombreArchivo.slice(posicionPunto + 1).toLowerCase();
}

export function compactarArbolParaPersistencia(
	nodos,
	proyectoId,
	padreId = null,
	acumulado = [],
) {
	let indice = 0;

	while (indice < nodos.length) {
		const nodo = nodos[indice];
		const esCarpeta = nodo.type === TIPO_NODO.CARPETA;
		const fechaActual = Date.now();

		acumulado.push({
			id: nodo.id,
			proyectoId,
			padreId,
			tipo: nodo.type,
			nombre: nodo.name,
			extension: esCarpeta ? "" : obtenerExtensionArchivo(nodo.name),
			orden: indice,
			contenido: esCarpeta ? "" : nodo.content ?? "",
			actualizadoEn: fechaActual,
		});

		if (esCarpeta && Array.isArray(nodo.children) && nodo.children.length > 0) {
			compactarArbolParaPersistencia(nodo.children, proyectoId, nodo.id, acumulado);
		}

		indice += 1;
	}

	return acumulado;
}

export function construirArbolJerarquico(nodosPlano) {
	const mapaNodos = new Map();
	const raices = [];

	let indice = 0;
	while (indice < nodosPlano.length) {
		const nodoPlano = nodosPlano[indice];
		mapaNodos.set(nodoPlano.id, {
			...nodoPlano,
			type: nodoPlano.tipo,
			name: nodoPlano.nombre,
			content: nodoPlano.contenido,
			children: [],
		});
		indice += 1;
	}

	indice = 0;
	while (indice < nodosPlano.length) {
		const nodoPlano = nodosPlano[indice];
		const nodoActual = mapaNodos.get(nodoPlano.id);

		if (nodoPlano.padreId === null) {
			raices.push(nodoActual);
		} else {
			const padre = mapaNodos.get(nodoPlano.padreId);
			if (padre) {
				padre.children.push(nodoActual);
			} else {
				raices.push(nodoActual);
			}
		}

		indice += 1;
	}

	ordenarNodosRecursivamente(raices);
	return raices;
}

function ordenarNodosRecursivamente(nodos) {
	nodos.sort(function (a, b) {
		if (a.orden === b.orden) {
			return a.nombre.localeCompare(b.nombre);
		}

		return a.orden - b.orden;
	});

	let indice = 0;
	while (indice < nodos.length) {
		const nodo = nodos[indice];
		if (nodo.tipo === TIPO_NODO.CARPETA && Array.isArray(nodo.children)) {
			ordenarNodosRecursivamente(nodo.children);
		}
		indice += 1;
	}
}

function buscarNodoPorIdEnPlano(nodosPlano, nodoId) {
	let indice = 0;
	while (indice < nodosPlano.length) {
		const nodo = nodosPlano[indice];
		if (nodo.id === nodoId) {
			return nodo;
		}
		indice += 1;
	}

	return null;
}

export function obtenerIdsDescendientes(nodosPlano, padreId) {
	const idsDescendientes = [];
	const cola = [padreId];

	while (cola.length > 0) {
		const idActual = cola.shift();
		let indice = 0;

		while (indice < nodosPlano.length) {
			const nodo = nodosPlano[indice];
			if (nodo.padreId === idActual) {
				idsDescendientes.push(nodo.id);
				if (nodo.tipo === TIPO_NODO.CARPETA) {
					cola.push(nodo.id);
				}
			}
			indice += 1;
		}
	}

	return idsDescendientes;
}

function obtenerPrimerArchivo(nodosJerarquicos) {
	let indice = 0;

	while (indice < nodosJerarquicos.length) {
		const nodo = nodosJerarquicos[indice];

		if (nodo.type === TIPO_NODO.ARCHIVO) {
			return nodo;
		}

		if (nodo.type === TIPO_NODO.CARPETA && Array.isArray(nodo.children)) {
			const nodoInterno = obtenerPrimerArchivo(nodo.children);
			if (nodoInterno) {
				return nodoInterno;
			}
		}

		indice += 1;
	}

	return null;
}

export function obtenerTodosLosArchivos(nodos, acumulado = {}) {
	let indice = 0;
	while (indice < nodos.length) {
		const nodo = nodos[indice];
		if (nodo.type === TIPO_NODO.ARCHIVO || nodo.type === "file") {
			acumulado[nodo.name] = nodo.content ?? "";
		} else if (
			(nodo.type === TIPO_NODO.CARPETA || nodo.type === "folder") &&
			Array.isArray(nodo.children)
		) {
			obtenerTodosLosArchivos(nodo.children, acumulado);
		}
		indice += 1;
	}
	return acumulado;
}

export const obtenerExtension = obtenerExtensionArchivo;
export const compactarArbol = compactarArbolParaPersistencia;
export const construirArbol = construirArbolJerarquico;
export const buscarNodoPlanoPorId = buscarNodoPorIdEnPlano;
export const obtenerPrimerNodoArchivo = obtenerPrimerArchivo;
export const extraerTodosLosArchivos = obtenerTodosLosArchivos;

