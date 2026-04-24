<script>
  let { contenido = "", lineas = [], alCambiarContenido } = $props();
</script>

<div class="editor-wrap">
  <div class="line-numbers">
    {#each lineas as linea}
      <span>{linea}</span>
    {/each}
  </div>

  <textarea
    value={contenido}
    spellcheck="false"
    oninput={(event) => alCambiarContenido(event.currentTarget.value)}
  ></textarea>
</div>

<style>
  .editor-wrap {
    display: grid;
    grid-template-columns: 56px 1fr;
    overflow: hidden;
    min-height: 0;
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
</style>
