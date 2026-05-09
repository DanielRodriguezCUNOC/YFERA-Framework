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
  import {
    obtenerPrimerNodoArchivo,
    extraerTodosLosArchivos,
  } from "$lib/arbol/arbol.selector.js";
  import { TIPO_NODO } from "$lib/arbol/arbol.types.js";
  import { compilador } from "$lib/gramatica/compilador-maestro";
  import JSZip from "jszip";
  import initSqlJs from "sql.js";
  import { parser as dbParser } from "$lib/gramatica/lexer-parser/grammar-DB.js";

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

  let erroresCompilacion = $state([]);
  let resultadosUltimaCompilacion = $state(null);
  let ultimasFuentesCompiladas = null;

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
      idsPestanasAbiertas = resultado.pestanas.map((pestana) => pestana.nodoId);

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

    // Guardar contenido del archivo actual antes de cambiar
    if (idNodoActivo && idNodoActivo !== nodeId) {
      await saveFile();
    }

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
          ? "Conexion con la base de datos establecida."
          : "Conexion con la base de datos finalizada.",
      },
    ];
  }

  function astToSql(stmt) {
    if (!stmt) return null;
    switch (stmt.tipo) {
      case "create_table": {
        const cols = stmt.columnas
          .map((c) => {
            let t = "TEXT";
            if (c.tipo === "int") t = "INTEGER";
            if (c.tipo === "float") t = "REAL";
            if (c.tipo === "boolean") t = "BOOLEAN";
            return `${c.nombre} ${t}`;
          })
          .join(", ");
        return `CREATE TABLE IF NOT EXISTS ${stmt.tabla} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${cols});`;
      }
      case "insert": {
        const cols = stmt.valores.map((v) => v.columna).join(", ");
        const vals = stmt.valores
          .map((v) => {
            if (typeof v.valor === "string")
              return `'${v.valor.replace(/'/g, "''")}'`;
            if (typeof v.valor === "boolean") return v.valor ? 1 : 0;
            return v.valor;
          })
          .join(", ");
        return `INSERT INTO ${stmt.tabla} (${cols}) VALUES (${vals});`;
      }
      case "update": {
        const sets = stmt.valores
          .map((v) => {
            let val = v.valor;
            if (typeof val === "string") val = `'${val.replace(/'/g, "''")}'`;
            else if (typeof val === "boolean") val = val ? 1 : 0;
            return `${v.columna} = ${val}`;
          })
          .join(", ");
        return `UPDATE ${stmt.tabla} SET ${sets} WHERE id = ${stmt.id};`;
      }
      case "delete":
        return `DELETE FROM ${stmt.tabla} WHERE id = ${stmt.id};`;
      case "select_column":
        return `SELECT ${stmt.columna} FROM ${stmt.tabla};`;
      case "select_columns":
        return `SELECT ${stmt.columnas.join(", ")} FROM ${stmt.tabla};`;
      default:
        return null;
    }
  }

  function buscarNodoPorNombreEnArbol(nodos, nombreBuscado) {
    let indice = 0;
    while (indice < nodos.length) {
      const nodo = nodos[indice];
      if (nodo.nombre === nombreBuscado || nodo.name === nombreBuscado) {
        return nodo;
      }

      if (Array.isArray(nodo.children) && nodo.children.length > 0) {
        const nodoInterno = buscarNodoPorNombreEnArbol(
          nodo.children,
          nombreBuscado,
        );
        if (nodoInterno) {
          return nodoInterno;
        }
      }

      indice += 1;
    }

    return null;
  }

  function toBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function fromBase64(b64) {
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function obtenerWasmBase64() {
    try {
      const response = await fetch("/sql-wasm.wasm");
      if (!response.ok) {
        return "";
      }
      const arrayBuffer = await response.arrayBuffer();
      return toBase64(arrayBuffer);
    } catch (e) {
      return "";
    }
  }

  function formatearResultadoSelect(resultados) {
    if (!Array.isArray(resultados) || resultados.length === 0) {
      return "[]";
    }

    const bloque = resultados[0];
    if (
      !bloque ||
      !Array.isArray(bloque.columns) ||
      !Array.isArray(bloque.values)
    ) {
      return "[]";
    }

    if (bloque.columns.length === 1) {
      return JSON.stringify(
        bloque.values.map((fila) => fila[0]),
        null,
        2,
      );
    }

    return JSON.stringify(
      bloque.values.map((fila) => {
        const objeto = {};
        let indice = 0;
        while (indice < bloque.columns.length) {
          objeto[bloque.columns[indice]] = fila[indice];
          indice += 1;
        }
        return objeto;
      }),
      null,
      2,
    );
  }

  async function sendCommand() {
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

    entradaConsola = "";

    try {
      // Parsing the DB command
      dbParser.erroresSintacticos = [];
      dbParser.erroresLexicos = [];
      const astList = dbParser.parse(command);

      if (
        dbParser.erroresSintacticos.length > 0 ||
        dbParser.erroresLexicos.length > 0
      ) {
        let errStr =
          dbParser.erroresSintacticos.map((e) => e.mensaje).join(", ") ||
          "Error de parseo DB";
        throw new Error(errStr);
      }

      // Locate or initialize database.sqlite in arbol
      let sqlFileId = null;
      let sqlFileContent = "";
      let sqlFileRef = null;
      const nodoSql = buscarNodoPorNombreEnArbol(arbol, "database.sqlite");
      if (nodoSql) {
        sqlFileId = nodoSql.id;
        sqlFileContent = nodoSql.contenido || nodoSql.content || "";
        sqlFileRef = nodoSql;
      }

      // Initialize sql.js

      let wasmBinary = null;
      try {
        const r = await fetch("/sql-wasm.wasm");
        if (r.ok) wasmBinary = await r.arrayBuffer();
      } catch (e) {
        // No se pudo cargar localmente, se usará la CDN
      }
      const SQL = await initSqlJs({
        wasmBinary,
        locateFile: (file) =>
          wasmBinary
            ? `/sql-wasm.wasm`
            : `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.1/${file}`,
      });
      let dbInstance;
      if (sqlFileContent && sqlFileContent.length > 0) {
        try {
          dbInstance = new SQL.Database(fromBase64(sqlFileContent));
        } catch (e) {
          dbInstance = new SQL.Database();
        }
      } else {
        dbInstance = new SQL.Database();
      }

      // Generate and run SQL for each statement
      let lastResultRows = 0;
      let resultadoConsulta = null;
      for (const stmt of astList) {
        const sqlStr = astToSql(stmt);
        if (sqlStr) {
          if (stmt.tipo === "select_column" || stmt.tipo === "select_columns") {
            resultadoConsulta = dbInstance.exec(sqlStr);
          } else {
            dbInstance.run(sqlStr);
          }
          lastResultRows++;
        }
      }

      // 5. Serialize DB and persist back to arbol
      const binaryArr = dbInstance.export();
      const base64Str = toBase64(binaryArr);

      if (!sqlFileId) {
        // Si no existe database.sqlite, crear el archivo en la raíz del proyecto y guardar el contenido
        let rootId = null;
        for (const node of arbol) {
          if (node.tipo === TIPO_NODO.CARPETA && node.padreId === null) {
            rootId = node.id;
            break;
          }
        }
        try {
          const res = await crearArchivo(
            idProyecto,
            rootId,
            "database.sqlite",
            base64Str,
          );
          arbol = res.arbol;
        } catch (e) {
          const msg = e?.message || String(e);
          if (msg.includes("Ya existe un nodo")) {
            // Esto puede ocurrir si el archivo fue creado en otra pestaña o ventana. Intentamos encontrarlo en el arbol y actualizar su contenido.
            function findByName(nodes, target) {
              for (const n of nodes) {
                if (
                  (n.nombre && n.nombre === target) ||
                  (n.name && n.name === target)
                )
                  return n;
                if (n.children && Array.isArray(n.children)) {
                  const found = findByName(n.children, target);
                  if (found) return found;
                }
              }
              return null;
            }

            const existing = findByName(arbol, "database.sqlite");
            if (existing) {
              sqlFileId = existing.id;
              await guardarContenidoArchivo(idProyecto, sqlFileId, base64Str);
              existing.contenido = base64Str;
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
      } else {
        await guardarContenidoArchivo(idProyecto, sqlFileId, base64Str);
        const node = buscarNodoPorId(arbol, sqlFileId);
        if (node) node.contenido = base64Str;
      }

      historialConsola = [
        ...historialConsola,
        {
          clase: "output",
          text:
            resultadoConsulta !== null
              ? formatearResultadoSelect(resultadoConsulta)
              : "Comando recibido y BD actualizada exitosamente.",
        },
      ];
    } catch (err) {
      historialConsola = [
        ...historialConsola,
        { clase: "error", text: "Error procesando consola DB: " + err.message },
      ];
    }
  }

  function clearConsole() {
    historialConsola = [{ clase: "system", text: "Consola limpiada." }];
  }

  async function compileProject() {
    historialConsola = [
      ...historialConsola,
      { clase: "system", text: "Iniciando compilación del proyecto..." },
    ];

    // Implementar mapeo de código desde el árbol de archivos hacia el compilador
    const fuentes = extraerTodosLosArchivos(arbol);
    ultimasFuentesCompiladas = fuentes;

    const fuentesCompilacion = {};
    for (const [ruta, contenido] of Object.entries(fuentes)) {
      const rutaNormalizada = String(ruta).toLowerCase();
      if (rutaNormalizada.endsWith(".sqlite") || rutaNormalizada.endsWith(".db")) {
        continue;
      }
      fuentesCompilacion[ruta] = contenido;
    }

    const resultados = await compilador.compilar(fuentesCompilacion);

    resultadosUltimaCompilacion = resultados;
    erroresCompilacion = resultados.errores || [];

    if (resultados.ok) {
      historialConsola = [
        ...historialConsola,
        { clase: "system", text: "Compilación completada" },
      ];
      if (resultados.css) {
        historialConsola = [
          ...historialConsola,
          {
            clase: "output",
            text: `CSS Generado:\n${resultados.css.substring(0, 100)}${resultados.css.length > 100 ? "..." : ""}`,
          },
        ];
      }
    } else {
      let i = 0;
      while (i < resultados.errores.length) {
        const err = resultados.errores[i];
        historialConsola = [
          ...historialConsola,
          {
            clase: "error",
            text: `Error de compilación: ${err.mensaje ?? err}`,
          },
        ];
        i += 1;
      }
    }
  }

  async function exportProject() {
    if (!resultadosUltimaCompilacion || !resultadosUltimaCompilacion.ok) {
      alert("Primero debes realizar una compilación exitosa.");
      return;
    }

    const zip = new JSZip();
    const res = resultadosUltimaCompilacion;
    const wasmBase64 = await obtenerWasmBase64();

    // Crear bundle único y HTML de arranque
    const indexHtml = compilador.generarBundle(res, { wasmBase64 });
    zip.file("index.html", indexHtml);
    zip.file("bundle.js", res.bundleJs || res.js || "");
    if (wasmBase64) {
      zip.file("sql-wasm.wasm", fromBase64(wasmBase64));
    }

    // Incluir archivos .sqlite si forman parte del proyecto
    try {
      const fuentesAll = extraerTodosLosArchivos(arbol);
      for (const [ruta, contenido] of Object.entries(fuentesAll)) {
        if (ruta && ruta.toLowerCase().endsWith(".sqlite")) {
          // contenido puede estar en base64 o texto
          const trimmed = typeof contenido === "string" ? contenido.trim() : "";
          let data;
          let esBase64 = trimmed.length % 4 === 0 && trimmed.length > 0;
          let indiceValidacion = 0;
          while (indiceValidacion < trimmed.length && esBase64) {
            const c = trimmed[indiceValidacion];
            if (
              !(
                (c >= "A" && c <= "Z") ||
                (c >= "a" && c <= "z") ||
                (c >= "0" && c <= "9") ||
                c === "+" ||
                c === "/" ||
                c === "=" ||
                c === "\r" ||
                c === "\n"
              )
            ) {
              esBase64 = false;
            }
            indiceValidacion += 1;
          }
          if (esBase64) {
            // base64 -> convertir a bytes
            const limpio = trimmed
              .split(" ")
              .join("")
              .split("\n")
              .join("")
              .split("\r")
              .join("");
            const binary = atob(limpio);
            const arr = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++)
              arr[i] = binary.charCodeAt(i);
            data = arr;
          } else {
            // fallback: tratar como texto y guardar como UTF-8
            data = new TextEncoder().encode(String(contenido));
          }
          zip.file(ruta, data);
        }
      }
    } catch (err) {
      console.warn("No se pudo incluir archivos .sqlite automáticamente:", err);
    }

    // Incluir archivos .sqlite (binarios) si fueron parte de la última compilación
    if (ultimasFuentesCompiladas) {
      for (const [ruta, contenido] of Object.entries(
        ultimasFuentesCompiladas,
      )) {
        if (
          typeof ruta === "string" &&
          (ruta.endsWith(".sqlite") || ruta.endsWith(".db"))
        ) {
          try {
            zip.file(ruta, contenido);
          } catch (e) {
            const blob = new Blob([contenido], {
              type: "application/octet-stream",
            });
            zip.file(ruta, blob);
          }
        }
      }
    }

    // Añadir respaldo del código fuente (.yfera)
    const nombreSinEspacios = nombreProyecto
      .split(" ")
      .join("_")
      .split("\t")
      .join("_")
      .split("\n")
      .join("_");
    const backupData = JSON.stringify(
      {
        nombre: nombreProyecto,
        arbol: arbol,
      },
      null,
      2,
    );
    zip.file(`${nombreSinEspacios}.yfera`, backupData);

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `${nombreSinEspacios}_export.zip`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);

    historialConsola = [
      ...historialConsola,
      { clase: "system", text: "Proyecto exportado exitosamente como .zip" },
    ];
  }

  async function previewProject() {
    if (!resultadosUltimaCompilacion || !resultadosUltimaCompilacion.ok) {
      alert("Primero debes realizar una compilación exitosa.");
      return;
    }

    const res = resultadosUltimaCompilacion;
    const wasmBase64 = await obtenerWasmBase64();
    const previewHtml = compilador.generarVistaPrevia(res, { wasmBase64 });
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const ventana = window.open(url, "_blank", "noopener,noreferrer");

    if (!ventana) {
      historialConsola = [
        ...historialConsola,
        {
          clase: "error",
          text: "No se pudo abrir la vista previa. El navegador bloqueó la ventana emergente.",
        },
      ];
      return;
    }

    historialConsola = [
      ...historialConsola,
      { clase: "system", text: "Vista previa abierta en una nueva pestaña." },
    ];
  }

  function exportProjectState() {
    const data = JSON.stringify(
      {
        nombre: nombreProyecto,
        arbol: arbol,
      },
      null,
      2,
    );

    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const nombreSinEspacios = nombreProyecto
      .split(" ")
      .join("_")
      .split("\t")
      .join("_")
      .split("\n")
      .join("_");
    link.download = `${nombreSinEspacios}.yfera`;
    link.click();

    historialConsola = [
      ...historialConsola,
      {
        clase: "system",
        text: "Copia de seguridad (.yfera) generada y descargada.",
      },
    ];
  }

  function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.arbol) {
          arbol = data.arbol;
          if (data.nombre) nombreProyecto = data.nombre;
          historialConsola = [
            ...historialConsola,
            {
              clase: "system",
              text: `Proyecto "${nombreProyecto}" cargado con éxito.`,
            },
          ];
        } else {
          alert("Archivo .yfera inválido.");
        }
      } catch (err) {
        alert("Error al parsear el archivo JSON.");
      }
    };
    reader.readAsText(file);
    // Limpiar input para permitir cargar el mismo archivo dos veces si se desea (No se porque el usuario quiera hacer eso)
    event.target.value = "";
  }

  let editorComponent;

  function handleColorSelect(color) {
    if (editorComponent && editorComponent.insertAtCursor) {
      editorComponent.insertAtCursor(color);
    }
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
      <label class="ghost btn-label">
        Importar (.yfera)
        <input type="file" accept=".yfera" onchange={handleImport} hidden />
      </label>
      <button class="ghost" onclick={exportProjectState}
        >Respaldar (.yfera)</button
      >
      <button class="ghost" onclick={previewProject}>Previsualizar</button>
      <button class="ghost" onclick={exportProject}>Exportar (ZIP)</button>
      <button onclick={compileProject}>Compilar</button>
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
        bind:this={editorComponent}
        contenido={contenidoEditor}
        {lineas}
        alCambiarContenido={(value) => (contenidoEditor = value)}
      />

      <PanelConsola
        {historialConsola}
        errores={erroresCompilacion}
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
      alSeleccionarColor={handleColorSelect}
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
    align-items: center;
  }

  .btn-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.52rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #4c5965;
    color: #f7b97a;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-label:hover {
    background: rgba(247, 185, 122, 0.1);
    border-color: #f7b97a;
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
