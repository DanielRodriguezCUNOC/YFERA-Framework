<script>
  import PanelArbol from "$lib/componentes/arbol/PanelArbol.svelte";
  import TabsBar from "$lib/componentes/arbol/TabsBar.svelte";
  import PanelEditor from "$lib/componentes/arbol/PanelEditor.svelte";
  import PanelConsola from "$lib/componentes/arbol/PanelConsola.svelte";
  import {
    initialProject,
    initialTree,
    defaultExpandedIds,
    defaultActiveNodeId,
    findNodeById,
    updateFileContent,
  } from "$lib/arbol/arbol.state";

  let tree = $state(initialTree);
  let expandedIds = $state(new Set(defaultExpandedIds));
  let activeNodeId = $state(defaultActiveNodeId);
  let openTabIds = $state([defaultActiveNodeId]);

  const activeNode = $derived(findNodeById(tree, activeNodeId));
  const openTabs = $derived(
    openTabIds
      .map((id) => findNodeById(tree, id))
      .filter((node) => node?.type === "file")
      .map((node) => ({ id: node.id, name: node.name })),
  );

  let editorContent = $state(
    findNodeById(initialTree, defaultActiveNodeId)?.content ?? "",
  );
  const lineCount = $derived(editorContent.split("\n").length);
  const lineNumbers = $derived(
    Array.from({ length: lineCount }, (_, index) => index + 1),
  );

  let connected = $state(false);
  let consoleInput = $state("");
  let consoleHistory = $state([
    {
      type: "system",
      text: 'Consola lista. Presiona "Conectar" para iniciar.',
    },
  ]);

  function openFile(nodeId) {
    const node = findNodeById(tree, nodeId);
    if (!node || node.type !== "file") return;

    activeNodeId = node.id;
    editorContent = node.content ?? "";

    if (!openTabIds.includes(node.id)) {
      openTabIds = [...openTabIds, node.id];
    }
  }

  function selectTab(tabId) {
    openFile(tabId);
  }

  function closeTab(tabId) {
    const filtered = openTabIds.filter((id) => id !== tabId);
    openTabIds = filtered;

    if (activeNodeId !== tabId) return;
    if (filtered.length === 0) {
      activeNodeId = null;
      editorContent = "";
      return;
    }

    const nextTabId = filtered[filtered.length - 1];
    openFile(nextTabId);
  }

  function toggleFolder(folderId) {
    const next = new Set(expandedIds);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    expandedIds = next;
  }

  function saveFile() {
    if (!activeNodeId) return;

    tree = updateFileContent(tree, activeNodeId, editorContent);
    const current = findNodeById(tree, activeNodeId);

    if (!current || current.type !== "file") return;

    consoleHistory = [
      ...consoleHistory,
      { type: "system", text: `Archivo ${current.name} guardado.` },
    ];
  }

  function toggleConnection() {
    connected = !connected;
    consoleHistory = [
      ...consoleHistory,
      {
        type: "system",
        text: connected
          ? "Conexion simulada con la base de datos establecida XDD."
          : "Conexion con la base de datos finalizada.",
      },
    ];
  }

  function sendCommand() {
    const command = consoleInput.trim();
    if (!command) return;

    consoleHistory = [
      ...consoleHistory,
      { type: "input", text: `> ${command}` },
    ];

    if (!connected) {
      consoleHistory = [
        ...consoleHistory,
        {
          type: "error",
          text: 'No hay conexion. Primero presiona "Conectar".',
        },
      ];
      consoleInput = "";
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

    consoleHistory = [...consoleHistory, { type: "output", text: response }];
    consoleInput = "";
  }

  function clearConsole() {
    consoleHistory = [{ type: "system", text: "Consola limpiada." }];
  }
</script>

<div class="app-shell">
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      <h1>YFERA Code Editor · {initialProject.name}</h1>
    </div>
    <div class="actions">
      <button class="ghost" onclick={saveFile}>Guardar</button>
    </div>
  </header>

  <div class="workspace">
    <section class="main-panel">
      <TabsBar
        tabs={openTabs}
        activeTabId={activeNodeId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
      />

      <PanelEditor
        content={editorContent}
        {lineNumbers}
        onContentInput={(value) => (editorContent = value)}
      />

      <PanelConsola
        {consoleHistory}
        {consoleInput}
        {connected}
        onInputChange={(value) => (consoleInput = value)}
        onSendCommand={sendCommand}
        onClearConsole={clearConsole}
        onToggleConnection={toggleConnection}
      />
    </section>

    <PanelArbol
      {tree}
      {activeNodeId}
      {expandedIds}
      onSelectFile={openFile}
      onToggleFolder={toggleFolder}
    />
  </div>

  <footer class="statusbar">
    <span>Proyecto academico · UI de editor</span>
    <span class:ok={connected}
      >{connected ? "DB conectada" : "DB desconectada"}</span
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
