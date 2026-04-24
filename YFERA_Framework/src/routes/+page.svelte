<script>
  import { onMount } from "svelte";
  import PanelArbol from "$lib/componentes/arbol/PanelArbol.svelte";
  import TabsBar from "$lib/componentes/arbol/TabsBar.svelte";
  import PanelEditor from "$lib/componentes/arbol/PanelEditor.svelte";
  import PanelConsola from "$lib/componentes/arbol/PanelConsola.svelte";
  import {
    proyectoInicial,
    arbolInicial,
    idsCarpetasIniciales,
    nodoActivoInicialId,
    buscarNodoPorId,
    actualizarContenidoArchivo,
  } from "$lib/arbol/arbol.state";
  import {
    cargarArbolPersistido,
    crearArchivo,
    crearCarpeta,
    eliminarNodo,
    guardarContenidoArchivo,
    guardarEstadoDeInterfaz,
    renombrarNodo,
  } from "$lib/arbol/arbol.service.js";
  import { obtenerPrimerNodoArchivo } from "$lib/arbol/arbol.selector.js";
  import { TIPO_NODO } from "$lib/arbol/arbol.types.js";

  let arbol = $state(arbolInicial);
  let idsCarpetasExpandidas = $state(new Set(idsCarpetasIniciales));
  let idNodoActivo = $state(nodoActivoInicialId);
  let idsPestanasAbiertas = $state([nodoActivoInicialId]);
  let idProyecto = $state(proyectoInicial.id);
  let nombreProyecto = $state(proyectoInicial.name);
  let estaCargando = $state(true);

  const nodoActivo = $derived(buscarNodoPorId(arbol, idNodoActivo));
  const pestanasAbiertas = $derived(construirPestanasAbiertas());

  let contenidoEditor = $state(
    buscarNodoPorId(arbolInicial, nodoActivoInicialId)?.content ?? "",
  );
  const cantidadLineas = $derived(contenidoEditor.split("\n").length);
  const lineas = $derived(construirNumerosDeLinea());

  let conexionActiva = $state(false);
  let entradaConsola = $state("");
  let historialConsola = $state([
    {
      clase: "system",
      text: 'Consola lista. Presiona "Conectar" para iniciar.',
    },
  ]);
  let menuContextual = $state({
    visible: false,
    x: 0,
    y: 0,
    nodo: null,
  });

  function construirPestanasAbiertas() {
    const pestanas = [];
    let indice = 0;

    while (indice < idsPestanasAbiertas.length) {
      const nodo = buscarNodoPorId(arbol, idsPestanasAbiertas[indice]);
      if (nodo && nodo.type === "file") {
        pestanas.push({ id: nodo.id, name: nodo.name });
      }
      indice += 1;
    }

    return pestanas;
  }

  function construirNumerosDeLinea() {
    const numeros = [];
    let numeroActual = 1;

    while (numeroActual <= cantidadLineas) {
      numeros.push(numeroActual);
      numeroActual += 1;
    }

    return numeros;
  }

  function obtenerContenidoNodoActivo(nodoId) {
    const nodo = buscarNodoPorId(arbol, nodoId);
    if (!nodo) {
      return "";
    }

    return nodo.content ?? nodo.contenido ?? "";
  }

  function sincronizarEstadoInterfaz() {
    if (!idProyecto) {
      return;
    }

    guardarEstadoDeInterfaz(idProyecto, idNodoActivo, idsPestanasAbiertas);
  }

  function cerrarMenuContextual() {
    menuContextual = {
      visible: false,
      x: 0,
      y: 0,
      nodo: null,
    };
  }

  function abrirMenuContextual(nodo, x, y) {
    menuContextual = {
      visible: true,
      x,
      y,
      nodo,
    };
  }

  function buscarNodoPorIdEnArbol(nodos, nodoId) {
    let indice = 0;
    while (indice < nodos.length) {
      const nodo = nodos[indice];
      if (nodo.id === nodoId) {
        return nodo;
      }

      if (nodo.type === TIPO_NODO.CARPETA && Array.isArray(nodo.children)) {
        const nodoInterno = buscarNodoPorIdEnArbol(nodo.children, nodoId);
        if (nodoInterno) {
          return nodoInterno;
        }
      }

      indice += 1;
    }

    return null;
  }

  function obtenerPrimerIdCarpetaRaiz() {
    let indice = 0;
    while (indice < arbol.length) {
      if (arbol[indice].type === TIPO_NODO.CARPETA) {
        return arbol[indice].id;
      }
      indice += 1;
    }

    return null;
  }

  function obtenerPadreDestinoDesdeNodo(nodo) {
    if (!nodo) {
      return obtenerPrimerIdCarpetaRaiz();
    }

    if (nodo.type === TIPO_NODO.CARPETA) {
      return nodo.id;
    }

    if (nodo.padreId) {
      return nodo.padreId;
    }

    return obtenerPrimerIdCarpetaRaiz();
  }

  function resolverCarpetaDestino() {
    if (!idNodoActivo) {
      return obtenerPrimerIdCarpetaRaiz();
    }

    const nodoActual = buscarNodoPorIdEnArbol(arbol, idNodoActivo);
    if (!nodoActual) {
      return obtenerPrimerIdCarpetaRaiz();
    }

    if (nodoActual.type === TIPO_NODO.CARPETA) {
      return nodoActual.id;
    }

    if (nodoActual.padreId) {
      return nodoActual.padreId;
    }

    return obtenerPrimerIdCarpetaRaiz();
  }

  async function crearNuevaCarpeta() {
    if (estaCargando) {
      return;
    }

    const nombre = window.prompt("Nombre de la carpeta:", "nueva-carpeta");
    if (!nombre) {
      return;
    }

    const padreId = resolverCarpetaDestino();
    if (!padreId) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: "No se encontro carpeta destino para crear." },
      ];
      return;
    }

    try {
      const resultado = await crearCarpeta(idProyecto, padreId, nombre);
      arbol = resultado.arbol;
      idsCarpetasExpandidas = new Set([
        ...idsCarpetasExpandidas,
        padreId,
        resultado.nodoNuevo.id,
      ]);

      historialConsola = [
        ...historialConsola,
        {
          clase: "system",
          text: `Carpeta ${resultado.nodoNuevo.nombre} creada.`,
        },
      ];
    } catch (error) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: error?.message ?? "No se pudo crear carpeta." },
      ];
    }
  }

  async function crearNuevoArchivo() {
    if (estaCargando) {
      return;
    }

    const nombre = window.prompt("Nombre del archivo:", "nuevo.comp");
    if (!nombre) {
      return;
    }

    const padreId = resolverCarpetaDestino();
    if (!padreId) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: "No se encontro carpeta destino para crear." },
      ];
      return;
    }

    try {
      const resultado = await crearArchivo(idProyecto, padreId, nombre, "");
      arbol = resultado.arbol;
      idsCarpetasExpandidas = new Set([...idsCarpetasExpandidas, padreId]);

      await openFile(resultado.nodoNuevo.id);

      historialConsola = [
        ...historialConsola,
        {
          clase: "system",
          text: `Archivo ${resultado.nodoNuevo.nombre} creado.`,
        },
      ];
    } catch (error) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: error?.message ?? "No se pudo crear archivo." },
      ];
    }
  }

  async function crearCarpetaDesdeMenu() {
    if (!menuContextual.nodo) {
      return;
    }

    const nombre = window.prompt("Nombre de la carpeta:", "nueva-carpeta");
    if (!nombre) {
      cerrarMenuContextual();
      return;
    }

    const padreId = obtenerPadreDestinoDesdeNodo(menuContextual.nodo);
    if (!padreId) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: "No se encontro carpeta destino para crear." },
      ];
      cerrarMenuContextual();
      return;
    }

    try {
      const resultado = await crearCarpeta(idProyecto, padreId, nombre);
      arbol = resultado.arbol;
      idsCarpetasExpandidas = new Set([
        ...idsCarpetasExpandidas,
        padreId,
        resultado.nodoNuevo.id,
      ]);

      historialConsola = [
        ...historialConsola,
        {
          clase: "system",
          text: `Carpeta ${resultado.nodoNuevo.nombre} creada.`,
        },
      ];
    } catch (error) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: error?.message ?? "No se pudo crear carpeta." },
      ];
    }

    cerrarMenuContextual();
  }

  async function crearArchivoDesdeMenu() {
    if (!menuContextual.nodo) {
      return;
    }

    const nombre = window.prompt("Nombre del archivo:", "nuevo.comp");
    if (!nombre) {
      cerrarMenuContextual();
      return;
    }

    const padreId = obtenerPadreDestinoDesdeNodo(menuContextual.nodo);
    if (!padreId) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: "No se encontro carpeta destino para crear." },
      ];
      cerrarMenuContextual();
      return;
    }

    try {
      const resultado = await crearArchivo(idProyecto, padreId, nombre, "");
      arbol = resultado.arbol;
      idsCarpetasExpandidas = new Set([...idsCarpetasExpandidas, padreId]);

      await openFile(resultado.nodoNuevo.id);

      historialConsola = [
        ...historialConsola,
        {
          clase: "system",
          text: `Archivo ${resultado.nodoNuevo.nombre} creado.`,
        },
      ];
    } catch (error) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: error?.message ?? "No se pudo crear archivo." },
      ];
    }

    cerrarMenuContextual();
  }

  async function renombrarNodoDesdeMenu() {
    if (!menuContextual.nodo) {
      return;
    }

    const nombreActual = menuContextual.nodo.name ?? "";
    const nuevoNombre = window.prompt("Nuevo nombre:", nombreActual);
    if (!nuevoNombre) {
      cerrarMenuContextual();
      return;
    }

    try {
      const resultado = await renombrarNodo(
        idProyecto,
        menuContextual.nodo.id,
        nuevoNombre,
      );
      arbol = resultado.arbol;

      if (idNodoActivo) {
        contenidoEditor = obtenerContenidoNodoActivo(idNodoActivo);
      }

      historialConsola = [
        ...historialConsola,
        {
          clase: "system",
          text: `Nodo renombrado a ${resultado.nodoActualizado.nombre}.`,
        },
      ];
    } catch (error) {
      historialConsola = [
        ...historialConsola,
        {
          clase: "error",
          text: error?.message ?? "No se pudo renombrar el nodo.",
        },
      ];
    }

    cerrarMenuContextual();
  }

  async function eliminarNodoDesdeMenu() {
    if (!menuContextual.nodo) {
      return;
    }

    if (menuContextual.nodo.padreId === null) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: "No se puede eliminar la carpeta raiz." },
      ];
      cerrarMenuContextual();
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar ${menuContextual.nodo.name} y su contenido?`,
    );
    if (!confirmado) {
      cerrarMenuContextual();
      return;
    }

    try {
      const resultado = await eliminarNodo(idProyecto, menuContextual.nodo.id);
      arbol = resultado.arbol;
      idsPestanasAbiertas = [];
      let indice = 0;
      while (indice < resultado.pestanas.length) {
        idsPestanasAbiertas.push(resultado.pestanas[indice].nodoId);
        indice += 1;
      }

      idsCarpetasExpandidas = new Set(
        [...idsCarpetasExpandidas].filter((idCarpeta) => {
          let indiceEliminado = 0;
          while (indiceEliminado < resultado.idsEliminados.length) {
            if (resultado.idsEliminados[indiceEliminado] === idCarpeta) {
              return false;
            }
            indiceEliminado += 1;
          }
          return true;
        }),
      );

      idNodoActivo = resultado.nodoActivoId;
      if (idNodoActivo) {
        contenidoEditor = obtenerContenidoNodoActivo(idNodoActivo);
      } else {
        contenidoEditor = "";
      }

      historialConsola = [
        ...historialConsola,
        {
          clase: "system",
          text: `Nodo ${menuContextual.nodo.name} eliminado.`,
        },
      ];

      sincronizarEstadoInterfaz();
    } catch (error) {
      historialConsola = [
        ...historialConsola,
        {
          clase: "error",
          text: error?.message ?? "No se pudo eliminar el nodo.",
        },
      ];
    }

    cerrarMenuContextual();
  }

  onMount(async function cargarDatosIniciales() {
    const resultado = await cargarArbolPersistido();

    if (!resultado) {
      estaCargando = false;
      return;
    }

    idProyecto = resultado.proyecto.id;
    nombreProyecto = resultado.proyecto.nombre;
    arbol = resultado.arbol;

    if (resultado.estadoInterfaz && resultado.estadoInterfaz.nodoActivoId) {
      idNodoActivo = resultado.estadoInterfaz.nodoActivoId;
    } else {
      const nodoInicial = obtenerPrimerNodoArchivo(arbol);
      idNodoActivo = nodoInicial ? nodoInicial.id : null;
    }

    idsPestanasAbiertas = [];
    let indice = 0;
    while (indice < resultado.pestanas.length) {
      idsPestanasAbiertas.push(resultado.pestanas[indice].nodoId);
      indice += 1;
    }

    if (idsPestanasAbiertas.length === 0 && idNodoActivo) {
      idsPestanasAbiertas = [idNodoActivo];
    }

    if (idNodoActivo) {
      contenidoEditor = obtenerContenidoNodoActivo(idNodoActivo);
    }

    estaCargando = false;
  });

  async function openFile(nodeId) {
    const node = buscarNodoPorId(arbol, nodeId);
    if (!node || node.type !== "file") return;

    idNodoActivo = node.id;
    contenidoEditor = node.content ?? "";

    if (!idsPestanasAbiertas.includes(node.id)) {
      idsPestanasAbiertas = [...idsPestanasAbiertas, node.id];
    }

    sincronizarEstadoInterfaz();
  }

  async function selectTab(tabId) {
    await openFile(tabId);
  }

  async function closeTab(tabId) {
    const filtros = [];
    let indice = 0;
    while (indice < idsPestanasAbiertas.length) {
      if (idsPestanasAbiertas[indice] !== tabId) {
        filtros.push(idsPestanasAbiertas[indice]);
      }
      indice += 1;
    }

    idsPestanasAbiertas = filtros;

    if (idNodoActivo !== tabId) return;
    if (filtros.length === 0) {
      idNodoActivo = null;
      contenidoEditor = "";
      sincronizarEstadoInterfaz();
      return;
    }

    const nextTabId = filtros[filtros.length - 1];
    await openFile(nextTabId);
  }

  function toggleFolder(folderId) {
    const next = new Set(idsCarpetasExpandidas);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    idsCarpetasExpandidas = next;
  }

  async function saveFile() {
    if (!idNodoActivo) return;

    arbol = actualizarContenidoArchivo(arbol, idNodoActivo, contenidoEditor);
    const current = buscarNodoPorId(arbol, idNodoActivo);

    if (!current || current.type !== "file") return;

    await guardarContenidoArchivo(idProyecto, idNodoActivo, contenidoEditor);
    sincronizarEstadoInterfaz();

    historialConsola = [
      ...historialConsola,
      { clase: "system", text: `Archivo ${current.name} guardado.` },
    ];
  }

  function toggleConnection() {
    conexionActiva = !conexionActiva;
    historialConsola = [
      ...historialConsola,
      {
        clase: "system",
        text: conexionActiva
          ? "Conexion simulada con la base de datos establecida XDD."
          : "Conexion con la base de datos finalizada.",
      },
    ];
  }

  function sendCommand() {
    const command = entradaConsola.trim();
    if (!command) return;

    historialConsola = [
      ...historialConsola,
      { clase: "input", text: `> ${command}` },
    ];

    if (!conexionActiva) {
      historialConsola = [
        ...historialConsola,
        {
          clase: "error",
          text: 'No hay conexion. Primero presiona "Conectar".',
        },
      ];
      entradaConsola = "";
      return;
    }

    let response = "Comando recibido por el servicio de base de datos.";
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.startsWith("select")) {
      response = "Consulta ejecutada. Filas simuladas: 3.";
    } else if (
      lowerCommand.startsWith("insert") ||
      lowerCommand.startsWith("update")
    ) {
      response = "Operacion aplicada correctamente (simulada).";
    } else if (lowerCommand.startsWith("delete")) {
      response = "Operacion DELETE aceptada con confirmacion simulada.";
    }

    historialConsola = [
      ...historialConsola,
      { clase: "output", text: response },
    ];
    entradaConsola = "";
  }

  function clearConsole() {
    historialConsola = [{ clase: "system", text: "Consola limpiada." }];
  }
</script>

<svelte:window
  onclick={cerrarMenuContextual}
  onkeydown={(event) => event.key === "Escape" && cerrarMenuContextual()}
/>

<div class="app-shell">
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      <h1>YFERA Code Editor · {nombreProyecto}</h1>
    </div>
    <div class="actions">
      <button class="ghost" onclick={saveFile}>Guardar</button>
    </div>
  </header>

  <div class="workspace">
    <section class="main-panel">
      <TabsBar
        pestanas={pestanasAbiertas}
        idPestanaActiva={idNodoActivo}
        alSeleccionarPestana={selectTab}
        alCerrarPestana={closeTab}
      />

      <PanelEditor
        contenido={contenidoEditor}
        {lineas}
        alCambiarContenido={(value) => (contenidoEditor = value)}
      />

      <PanelConsola
        {historialConsola}
        {entradaConsola}
        {conexionActiva}
        alCambiarEntrada={(value) => (entradaConsola = value)}
        alEnviarComando={sendCommand}
        alLimpiarConsola={clearConsole}
        alAlternarConexion={toggleConnection}
      />
    </section>

    <PanelArbol
      {arbol}
      {idNodoActivo}
      {idsCarpetasExpandidas}
      alSeleccionarArchivo={openFile}
      alAlternarCarpeta={toggleFolder}
      alCrearCarpeta={crearNuevaCarpeta}
      alCrearArchivo={crearNuevoArchivo}
      alAbrirMenuContextual={abrirMenuContextual}
    />
  </div>

  {#if menuContextual.visible}
    <div
      class="menu-contextual"
      style={`left:${menuContextual.x}px; top:${menuContextual.y}px;`}
    >
      <button
        onclick={(event) => {
          event.stopPropagation();
          crearCarpetaDesdeMenu();
        }}
      >
        Crear carpeta
      </button>
      <button
        onclick={(event) => {
          event.stopPropagation();
          crearArchivoDesdeMenu();
        }}
      >
        Crear archivo
      </button>
      <button
        onclick={(event) => {
          event.stopPropagation();
          renombrarNodoDesdeMenu();
        }}
      >
        Renombrar
      </button>
      <button
        class="peligro"
        onclick={(event) => {
          event.stopPropagation();
          eliminarNodoDesdeMenu();
        }}
      >
        Eliminar
      </button>
    </div>
  {/if}

  <footer class="statusbar">
    <span>{estaCargando ? "Cargando árbol..." : "Cargue un proyecto"}</span>
    <span class:ok={conexionActiva}
      >{conexionActiva ? "DB conectada" : "DB desconectada"}</span
    >
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
    background: radial-gradient(circle at 20% 0%, #2f1f16 0%, transparent 48%),
      radial-gradient(circle at 100% 100%, #1a242d 0%, #0f1419 50%);
    color: #f7efe8;
  }

  .app-shell {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: rgba(10, 15, 20, 0.9);
    border-bottom: 1px solid #3f4b53;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .brand h1 {
    font-size: 1rem;
    letter-spacing: 0.03em;
    margin: 0;
  }

  .brand-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: #f28c28;
    box-shadow: 0 0 12px #f28c28;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 0.8rem;
    padding: 0.8rem;
    overflow: hidden;
    min-height: 0;
  }

  .menu-contextual {
    position: fixed;
    z-index: 40;
    min-width: 180px;
    display: grid;
    gap: 0.25rem;
    padding: 0.45rem;
    border: 1px solid #2f3a44;
    border-radius: 10px;
    background: rgba(10, 15, 20, 0.98);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  }

  .menu-contextual button {
    width: 100%;
    text-align: left;
    padding: 0.45rem 0.6rem;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #d8e3ed;
    cursor: pointer;
    font-weight: 600;
  }

  .menu-contextual button:hover {
    background: #1b2630;
    border-color: #2f3a44;
  }

  .menu-contextual button.peligro {
    color: #ffb0b0;
  }

  .main-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) 280px;
    overflow: hidden;
    background: rgba(15, 21, 28, 0.88);
    border: 1px solid #2f3a44;
    border-radius: 12px;
    min-height: 0;
  }

  button {
    padding: 0.52rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #f28c28;
    background: linear-gradient(180deg, #f7a14a 0%, #f28c28 100%);
    color: #111;
    font-weight: 700;
    cursor: pointer;
  }

  button.ghost {
    background: transparent;
    color: #f7b97a;
    border-color: #4c5965;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .statusbar {
    display: flex;
    justify-content: space-between;
    padding: 0.45rem 0.75rem;
    font-size: 0.82rem;
    background: rgba(10, 15, 20, 0.92);
    border-top: 1px solid #2f3a44;
    color: #b9c5cf;
  }

  .statusbar .ok {
    color: #91efb6;
  }

  @media (max-width: 980px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .main-panel {
      grid-template-rows: auto minmax(300px, 1fr) 260px;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      flex-direction: column;
      align-items: stretch;
      gap: 0.7rem;
    }

    .actions {
      justify-content: flex-end;
    }
  }
</style>
