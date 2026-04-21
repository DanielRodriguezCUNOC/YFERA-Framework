<script>
  const initialFiles = [
    {
      name: "main.yf",
      content: `COMPONENT App {
	button id="saveBtn" text="Guardar"
}

STYLE App {
	background: #fff;
	color: #333;
}`,
    },
    {
      name: "consulta.db",
      content: `SELECT * FROM usuarios;
INSERT INTO logs (accion) VALUES ('editor abierto');`,
    },
    {
      name: "estilos.st",
      content: `WINDOW {
	padding: 12;
	border: 1px solid #f28c28;
}`,
    },
  ];

  let files = $state(initialFiles);
  let activeFileName = $state(initialFiles[0].name);
  const activeFile = $derived(
    files.find((file) => file.name === activeFileName) ?? files[0],
  );
  let editorContent = $state(initialFiles[0].content);

  let connected = $state(false);
  let consoleInput = $state("");
  let consoleHistory = $state([
    {
      type: "system",
      text: 'Consola lista. Presiona "Conectar" para iniciar.',
    },
  ]);

  const lineCount = $derived(editorContent.split("\n").length);
  const lineNumbers = $derived(
    Array.from({ length: lineCount }, (_, index) => index + 1),
  );

  function openFile(file) {
    if (activeFileName !== file.name) {
      activeFileName = file.name;
      editorContent = file.content;
    }
  }

  function saveFile() {
    files = files.map((file) =>
      file.name === activeFileName ? { ...file, content: editorContent } : file,
    );
    consoleHistory = [
      ...consoleHistory,
      { type: "system", text: `Archivo ${activeFileName} guardado.` },
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
      <h1>YFERA Code Editor</h1>
    </div>
    <div class="actions">
      <button class="ghost" onclick={saveFile}>Guardar</button>
      <button class:connected onclick={toggleConnection}>
        {connected ? "Desconectar" : "Conectar"} DB
      </button>
    </div>
  </header>

  <div class="workspace">
    <section class="main-panel">
      <div class="tabbar">
        <span class="active-tab">{activeFile.name}</span>
      </div>

      <div class="editor-wrap">
        <div class="line-numbers">
          {#each lineNumbers as line}
            <span>{line}</span>
          {/each}
        </div>
        <textarea bind:value={editorContent} spellcheck="false"></textarea>
      </div>

      <section class="console-panel">
        <div class="console-head">
          <h2>Consola DB</h2>
          <button class="ghost" onclick={clearConsole}>Limpiar</button>
        </div>
        <div class="console-output">
          {#each consoleHistory as item}
            <p class={item.type}>{item.text}</p>
          {/each}
        </div>
        <div class="console-input-row">
          <input
            type="text"
            placeholder="Escribe una consulta SQL o comando"
            bind:value={consoleInput}
            onkeydown={(event) => event.key === "Enter" && sendCommand()}
          />
          <button onclick={sendCommand}>Enviar</button>
        </div>
      </section>
    </section>

    <aside class="files-panel">
      <div class="files-head">
        <h2>Archivos</h2>
        <span>{files.length}</span>
      </div>
      <ul>
        {#each files as file}
          <li>
            <button
              class:active={file.name === activeFileName}
              onclick={() => openFile(file)}
            >
              {file.name}
            </button>
          </li>
        {/each}
      </ul>
    </aside>
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
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 0.8rem;
    padding: 0.8rem;
    overflow: hidden;
  }

  .main-panel,
  .files-panel,
  .console-panel {
    background: rgba(15, 21, 28, 0.88);
    border: 1px solid #2f3a44;
    border-radius: 12px;
  }

  .main-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) 260px;
    overflow: hidden;
  }

  .tabbar {
    padding: 0.5rem 0.7rem;
    border-bottom: 1px solid #2f3a44;
  }

  .active-tab {
    display: inline-block;
    padding: 0.35rem 0.7rem;
    background: #1f2a33;
    border: 1px solid #f28c28;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .editor-wrap {
    display: grid;
    grid-template-columns: 56px 1fr;
    overflow: hidden;
  }

  .line-numbers {
    margin: 0;
    padding: 0.8rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    text-align: right;
    font-family: "Fira Code", "Cascadia Mono", monospace;
    color: #7e8a95;
    background: #121a22;
    user-select: none;
    overflow: hidden;
  }

  .line-numbers span {
    height: 1.4rem;
    font-size: 0.8rem;
  }

  textarea {
    width: 100%;
    height: 100%;
    padding: 0.8rem;
    border: none;
    outline: none;
    resize: none;
    font-size: 0.92rem;
    line-height: 1.4rem;
    font-family: "Fira Code", "Cascadia Mono", monospace;
    background: #0d141b;
    color: #f4f7fa;
  }

  .console-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
  }

  .console-head,
  .files-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid #2f3a44;
  }

  h2 {
    margin: 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: #ffb061;
  }

  .console-output {
    padding: 0.7rem;
    overflow: auto;
    font-family: "Fira Code", "Cascadia Mono", monospace;
    font-size: 0.82rem;
  }

  .console-output p {
    margin: 0 0 0.4rem;
  }

  .console-output .system {
    color: #9ac8ff;
  }

  .console-output .input {
    color: #ffd7ae;
  }

  .console-output .output {
    color: #9ef0bd;
  }

  .console-output .error {
    color: #ff9a9a;
  }

  .console-input-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    padding: 0.7rem;
    border-top: 1px solid #2f3a44;
  }

  input {
    padding: 0.6rem 0.7rem;
    border-radius: 8px;
    border: 1px solid #3b4956;
    background: #0f171f;
    color: #eef4fa;
    outline: none;
  }

  input:focus {
    border-color: #f28c28;
  }

  .files-panel {
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  ul {
    list-style: none;
    padding: 0.45rem;
    margin: 0;
    overflow: auto;
  }

  li button {
    width: 100%;
    text-align: left;
    padding: 0.55rem 0.6rem;
    background: transparent;
    border: 1px solid transparent;
    color: #dae5ef;
    border-radius: 8px;
    cursor: pointer;
  }

  li button:hover {
    background: #1b2630;
    border-color: #2f3a44;
  }

  li button.active {
    background: rgba(242, 140, 40, 0.18);
    border-color: #f28c28;
    color: #ffd8ad;
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

  button.connected {
    border-color: #85d6a0;
    background: linear-gradient(180deg, #9ce6b4 0%, #68c68b 100%);
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
      grid-template-rows: auto minmax(300px, 1fr) 230px;
    }

    .files-panel {
      max-height: 220px;
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

    .console-input-row {
      grid-template-columns: 1fr;
    }
  }
</style>
