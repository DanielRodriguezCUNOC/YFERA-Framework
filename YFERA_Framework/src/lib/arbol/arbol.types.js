export const TIPO_NODO_ARBOL = Object.freeze({
	CARPETA: "folder",
	ARCHIVO: "file",
});

export const CLAVE_ESTADO_INTERFAZ_ARBOL = "estado-interfaz";

/**
 * @typedef {Object} ProyectoArbol
 * @property {string} id
 * @property {string} nombre
 * @property {number} creadoEn
 * @property {number} actualizadoEn
 * @property {number} ultimoAcceso
 */

/**
 * @typedef {Object} NodoArbolPlano
 * @property {string} id
 * @property {string} proyectoId
 * @property {string | null} padreId
 * @property {'folder' | 'file'} tipo
 * @property {string} nombre
 * @property {string} extension
 * @property {number} orden
 * @property {string} contenido
 * @property {number} actualizadoEn
 */

export const TIPO_NODO = TIPO_NODO_ARBOL;
export const CLAVE_ESTADO_INTERFAZ = CLAVE_ESTADO_INTERFAZ_ARBOL;

/**
 * @typedef {Object} EstadoInterfazArbol
 * @property {string} id
 * @property {string} proyectoId
 * @property {string | null} nodoActivoId
 * @property {number} actualizadoEn
 */
