<script>
  let { alSeleccionarColor } = $props();
  let colorActual = $state("#f28c28");
</script>

<div class="color-picker">
  <div class="picker-header">
    <h3>Selector de Color</h3>
  </div>
  
  <div class="main-selector">
    <div class="input-wrap">
      <input type="color" bind:value={colorActual} />
      <span>{colorActual.toUpperCase()}</span>
    </div>
    <button class="primary" onclick={() => alSeleccionarColor(colorActual.toUpperCase())}>
      Insertar
    </button>
  </div>
</div>

<style>
  .color-picker {
    padding: 0.8rem;
    background: #121a22;
    border-top: 1px solid #2f3a44;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .picker-header {
    display: flex;
    align-items: center;
  }

  h3 {
    margin: 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7e8a95;
  }

  .main-selector {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #0d141b;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    border: 1px solid #2f3a44;
  }

  input[type="color"] {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }

  span {
    font-family: "Fira Code", monospace;
    font-size: 0.75rem;
    color: #d8e3ed;
  }

  button.primary {
    padding: 0.4rem 0.8rem;
    background: #f28c28;
    color: #111;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.75rem;
    cursor: pointer;
  }
</style>
