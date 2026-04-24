import baseDeDatosArbol from "$lib/db/dexie.js";

export async function abrirBaseDatosArbol() {
	await baseDeDatosArbol.open();
	return baseDeDatosArbol;
}

export async function obtenerProyectoReciente() {
	await abrirBaseDatosArbol();
	return await baseDeDatosArbol.proyectos.orderBy("ultimoAcceso").last();
}

export async function obtenerProyectoPorIdentificador(proyectoId) {
	await abrirBaseDatosArbol();
	return await baseDeDatosArbol.proyectos.get(proyectoId);
}

export async function guardarProyecto(proyecto) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.proyectos.put(proyecto);
	return proyecto;
}

export async function borrarProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.transaction(
		"rw",
		baseDeDatosArbol.proyectos,
		baseDeDatosArbol.nodos,
		baseDeDatosArbol.pestanas,
		baseDeDatosArbol.estadoInterfaz,
		async function () {
			await baseDeDatosArbol.pestanas.where("proyectoId").equals(proyectoId).delete();
			await baseDeDatosArbol.estadoInterfaz.where("proyectoId").equals(proyectoId).delete();
			await baseDeDatosArbol.nodos.where("proyectoId").equals(proyectoId).delete();
			await baseDeDatosArbol.proyectos.delete(proyectoId);
		},
	);
}

export async function guardarNodo(nodo) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.nodos.put(nodo);
	return nodo;
}

export async function guardarNodos(nodos) {
	await abrirBaseDatosArbol();
	if (nodos.length === 0) {
		return [];
	}

	await baseDeDatosArbol.nodos.bulkPut(nodos);
	return nodos;
}

export async function obtenerNodosPorProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	return await baseDeDatosArbol.nodos.where("proyectoId").equals(proyectoId).toArray();
}

export async function borrarNodosPorProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.nodos.where("proyectoId").equals(proyectoId).delete();
}

export async function borrarNodosPorIds(idsNodos) {
	await abrirBaseDatosArbol();
	if (idsNodos.length === 0) {
		return;
	}

	let indice = 0;
	while (indice < idsNodos.length) {
		await baseDeDatosArbol.nodos.delete(idsNodos[indice]);
		indice += 1;
	}
}

export async function obtenerEstadoInterfazPorProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	return await baseDeDatosArbol.estadoInterfaz.where("proyectoId").equals(proyectoId).first();
}

export async function guardarEstadoInterfaz(estadoInterfaz) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.estadoInterfaz.put(estadoInterfaz);
	return estadoInterfaz;
}

export async function borrarEstadoInterfazPorProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.estadoInterfaz.where("proyectoId").equals(proyectoId).delete();
}

export async function obtenerPestanasPorProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	return await baseDeDatosArbol.pestanas.where("proyectoId").equals(proyectoId).sortBy("orden");
}

export async function guardarPestanas(pestanas) {
	await abrirBaseDatosArbol();
	if (pestanas.length === 0) {
		return [];
	}

	await baseDeDatosArbol.pestanas.bulkPut(pestanas);
	return pestanas;
}

export async function borrarPestanasPorProyecto(proyectoId) {
	await abrirBaseDatosArbol();
	await baseDeDatosArbol.pestanas.where("proyectoId").equals(proyectoId).delete();
}

export async function contarProyectos() {
	await abrirBaseDatosArbol();
	return await baseDeDatosArbol.proyectos.count();
}

export const abrirBaseDeDatosArbol = abrirBaseDatosArbol;
export const obtenerProyectoMasReciente = obtenerProyectoReciente;
export const obtenerProyectoPorId = obtenerProyectoPorIdentificador;
