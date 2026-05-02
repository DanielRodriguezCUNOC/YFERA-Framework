<script>
  import { resaltarYfera } from "$lib/util/SyntaxHighlighter.js";

  let { contenido = "", lineas = [], alCambiarContenido, alInsertarTexto } = $props();

  let elementTextarea;
  let elementHighlight;

  function handleScroll(e) {
    if (elementHighlight) {
      elementHighlight.scrollTop = e.target.scrollTop;
      elementHighlight.scrollLeft = e.target.scrollLeft;
    }
  }

  export function insertAtCursor(text) {
    if (!elementTextarea) return;
    const start = elementTextarea.selectionStart;
    const end = elementTextarea.selectionEnd;
    const nuevoContenido = contenido.substring(0, start) + text + contenido.substring(end);
    alCambiarContenido(nuevoContenido);
    
    // Devolver el foco y posicionar cursor
    setTimeout(() => {
      elementTextarea.focus();
      elementTextarea.selectionStart = elementTextarea.selectionEnd = start + text.length;
    }, 10);
  }

  let htmlResaltado = $derived(resaltarYfera(contenido));
</script>

<div class="editor-wrap">
  <div class="line-numbers">
    {#each lineas as linea}
      <span>{linea}</span>
    {/each}
  </div>

  <div class="editor-container">
    <div 
      class="editor-highlight" 
      bind:this={elementHighlight}
      aria-hidden="true"
    >
      {@html htmlResaltado + "\n"}
    </div>
    <textarea
      bind:this={elementTextarea}
      value={contenido}
      spellcheck="false"
      oninput={(event) => alCambiarContenido(event.currentTarget.value)}
      onscroll={handleScroll}
    ></textarea>
  </div>
</div>

<style>
  .editor-wrap {
    display: grid;
    grid-template-columns: 56px 1fr;
    overflow: hidden;
    min-height: 0;
    position: relative;
    background: #0d141b;
  }

  .line-numbers {
    margin: 0;
    padding: 0.8rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    text-align: right;
    font-family: "Fira Code", "Cascadia Mono", monospace;
    color: #4f5b66;
    background: #121a22;
    user-select: none;
    overflow: hidden;
    border-right: 1px solid #1b2630;
    z-index: 5;
  }

  .line-numbers span {
    height: 1.4rem;
    font-size: 0.8rem;
    line-height: 1.4rem;
  }

  .editor-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  textarea, .editor-highlight {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0.8rem;
    margin: 0;
    border: none;
    font-size: 0.92rem;
    line-height: 1.4rem;
    font-family: "Fira Code", "Cascadia Mono", monospace;
    white-space: pre;
    word-wrap: normal;
    overflow: auto;
    box-sizing: border-box;
    tab-size: 4;
  }

  textarea {
    background: transparent;
    color: transparent;
    caret-color: #f28c28; /* Color del cursor */
    z-index: 2;
    resize: none;
    outline: none;
  }

  .editor-highlight {
    color: #f4f7fa;
    z-index: 1;
    pointer-events: none;
  }

  /* --- PALETA DE COLORES DE SINTAXIS --- */
  :global(.token-comment) { color: #6272a4; font-style: italic; }
  :global(.token-string) { color: #f1fa8c; }
  :global(.token-db) { color: #ffb86c; background: rgba(255, 184, 108, 0.05); }
  :global(.token-keyword) { color: #ff79c6; font-weight: bold; }
  :global(.token-variable) { color: #8be9fd; }
  :global(.token-number) { color: #bd93f9; }
  :global(.token-symbol) { color: #f8f8f2; opacity: 0.8; }
  :global(.token-operator) { color: #50fa7b; }
</style>
