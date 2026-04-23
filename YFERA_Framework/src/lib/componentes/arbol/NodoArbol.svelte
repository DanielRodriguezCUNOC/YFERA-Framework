<script>
  import NodoArbol from "./NodoArbol.svelte";

  let {
    node,
    level = 0,
    activeNodeId,
    expandedIds,
    onSelectFile,
    onToggleFolder,
  } = $props();

  const isFolder = $derived(node.type === "folder");
  const isExpanded = $derived(isFolder && expandedIds.has(node.id));
  const isActive = $derived(node.type === "file" && activeNodeId === node.id);

  function handleClick() {
    if (node.type === "folder") {
      onToggleFolder(node.id);
      return;
    }

    onSelectFile(node.id);
  }
</script>

<li>
  <button
    class="node-btn"
    class:folder={isFolder}
    class:file={node.type === "file"}
    class:active={isActive}
    onclick={handleClick}
    style={`--level:${level}`}
  >
    <span class="icon">{isFolder ? (isExpanded ? "▾" : "▸") : "•"}</span>
    <span class="name">{node.name}</span>
  </button>

  {#if isFolder && isExpanded}
    <ul class="children">
      {#each node.children ?? [] as child (child.id)}
        <NodoArbol
          node={child}
          level={level + 1}
          {activeNodeId}
          {expandedIds}
          {onSelectFile}
          {onToggleFolder}
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
