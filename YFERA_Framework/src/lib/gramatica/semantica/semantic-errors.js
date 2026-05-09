export function formatearError(mensaje, options = {}) {
  const { tipo = 'Error Semántico', linea = null, columna = null, contexto = null } = options;
  const err = {
    tipo,
    mensaje: String(mensaje),
    linea: linea,
    columna: columna
  };
  if (contexto) err.contexto = contexto;
  return err;
}

export function extraerUbicacion(nodo) {
  if (!nodo || typeof nodo !== 'object') return { linea: null, columna: null, contexto: null };
  return {
    linea: nodo.linea != null ? nodo.linea : null,
    columna: nodo.columna != null ? nodo.columna : null,
    contexto: nodo.contexto != null ? nodo.contexto : null
  };
}
