<script>
  import NodoArbol from "./NodoArbol.svelte";

  let {
    nodo,
    nivel = 0,
    idNodoActivo,
    idsCarpetasExpandidas,
    alSeleccionarArchivo,
    alAlternarCarpeta,
    alAbrirMenuContextual,
  } = $props();

  const esCarpeta = $derived(nodo.type === "folder");
  const estaExpandido = $derived(
    esCarpeta && idsCarpetasExpandidas.has(nodo.id),
  );
  const estaActivo = $derived(nodo.type === "file" && idNodoActivo === nodo.id);

  function handleClick() {
    if (nodo.type === "folder") {
      alAlternarCarpeta(nodo.id);
      return;
    }

    alSeleccionarArchivo(nodo.id);
  }

  function handleContextMenu(event) {
    event.preventDefault();
    alAbrirMenuContextual(nodo, event.clientX, event.clientY);
  }
</script>

<li>
  <button
    class="node-btn"
    class:folder={esCarpeta}
    class:file={nodo.type === "file"}
    class:active={estaActivo}
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    style={`--level:${nivel}`}
  >
    <span class="icon">{esCarpeta ? (estaExpandido ? "▾" : "▸") : "•"}</span>
    <span class="name">{nodo.name}</span>
  </button>

  {#if esCarpeta && estaExpandido}
    <ul class="children">
      {#each nodo.children ?? [] as hijo (hijo.id)}
        <NodoArbol
          nodo={hijo}
          nivel={nivel + 1}
          {idNodoActivo}
          {idsCarpetasExpandidas}
          {alSeleccionarArchivo}
          {alAlternarCarpeta}
          {alAbrirMenuContextual}
        />
      {/each}
    </ul>
  {/if}
</li>

<style>
  li {
    list-style: none;
  }

  .children {
    margin: 0;
    padding: 0;
  }

  .node-btn {
    width: 100%;
    display: grid;
    grid-template-columns: 18px 1fr;
    align-items: center;
    gap: 0.35rem;
    text-align: left;
    padding: 0.48rem 0.55rem 0.48rem calc(0.5rem + (var(--level) * 0.8rem));
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #dae5ef;
    cursor: pointer;
  }

  .node-btn:hover {
    background: #1b2630;
    border-color: #2f3a44;
  }

  .node-btn.active {
    background: rgba(242, 140, 40, 0.18);
    border-color: #f28c28;
    color: #ffd8ad;
  }

  .icon {
    color: #9cadbc;
    font-size: 0.8rem;
  }

  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
