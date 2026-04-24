export const DB_NAME = "yfera_arbol_db";
export const DB_VERSION = 1;

export const TABLAS = {
  proyectos: "id, nombre, creadoEn, actualizadoEn, ultimoAcceso",
  nodos:
    "id, proyectoId, padreId, tipo, nombre, extension, orden, contenido, actualizadoEn, [proyectoId+padreId], [proyectoId+tipo]",
  pestanas: "id, proyectoId, nodoId, orden, fijada",
  estadoInterfaz: "id, proyectoId, nodoActivoId, actualizadoEn",
};

export const STORES = TABLAS;

