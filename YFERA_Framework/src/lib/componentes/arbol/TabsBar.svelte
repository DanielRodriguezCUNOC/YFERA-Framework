<script>
  let { tabs = [], activeTabId = null, onSelectTab, onCloseTab } = $props();
</script>

<div class="tabbar">
  {#if tabs.length === 0}
    <span class="empty">Sin archivos abiertos</span>
  {:else}
    {#each tabs as tab (tab.id)}
      <button
        class="tab"
        class:active={tab.id === activeTabId}
        onclick={() => onSelectTab(tab.id)}
      >
        <span class="tab-name">{tab.name}</span>
        <span
          class="close"
          role="button"
          tabindex="0"
          onclick={(event) => {
            event.stopPropagation();
            onCloseTab(tab.id);
          }}
          onkeydown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onCloseTab(tab.id);
            }
          }}>x</span
        >
      </button>
    {/each}
  {/if}
</div>

<style>
  .tabbar {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.7rem;
    border-bottom: 1px solid #2f3a44;
    overflow-x: auto;
  }

  .empty {
    color: #90a0af;
    font-size: 0.85rem;
    padding: 0.35rem 0.2rem;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.55rem;
    border-radius: 8px;
    border: 1px solid #3a4752;
    background: #1b252e;
    color: #d8e3ed;
    cursor: pointer;
    min-width: 0;
  }

  .tab.active {
    border-color: #f28c28;
    background: #222f3a;
  }

  .tab-name {
    white-space: nowrap;
  }

  .close {
    width: 1rem;
    height: 1rem;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    color: #a4b2bf;
    font-size: 0.75rem;
    line-height: 1;
  }

  .close:hover,
  .close:focus-visible {
    outline: none;
    background: rgba(242, 140, 40, 0.2);
    color: #ffd8ad;
  }
</style>
