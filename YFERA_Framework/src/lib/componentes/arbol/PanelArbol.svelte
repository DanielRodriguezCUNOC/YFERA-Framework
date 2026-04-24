<script>
	import NodoArbol from "./NodoArbol.svelte";

	let {
		arbol,
		idNodoActivo,
		idsCarpetasExpandidas,
		alSeleccionarArchivo,
		alAlternarCarpeta,
		alCrearCarpeta,
		alCrearArchivo,
		alAbrirMenuContextual,
	} = $props();
</script>

<aside class="files-panel">
	<div class="files-head">
		<h2>Arbol de trabajo</h2>
		<div class="acciones-arbol">
			<button class="mini" onclick={alCrearCarpeta}>+ Carpeta</button>
			<button class="mini" onclick={alCrearArchivo}>+ Archivo</button>
		</div>
	</div>

	<ul>
		{#each arbol as nodo (nodo.id)}
			<NodoArbol
				{nodo}
				nivel={0}
				{idNodoActivo}
				{idsCarpetasExpandidas}
				{alSeleccionarArchivo}
				{alAlternarCarpeta}
				{alAbrirMenuContextual}
			/>
		{/each}
	</ul>
</aside>

<style>
	.files-panel {
		overflow: hidden;
		display: grid;
		grid-template-rows: auto 1fr;
		background: rgba(15, 21, 28, 0.88);
		border: 1px solid #2f3a44;
		border-radius: 12px;
		min-height: 0;
	}

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

	.acciones-arbol {
		display: flex;
		gap: 0.35rem;
	}

	.mini {
		padding: 0.28rem 0.45rem;
		border-radius: 6px;
		border: 1px solid #4c5965;
		background: transparent;
		color: #f7b97a;
		font-size: 0.76rem;
		cursor: pointer;
	}

	.mini:hover {
		border-color: #f28c28;
		background: rgba(242, 140, 40, 0.12);
	}

	ul {
		list-style: none;
		padding: 0.45rem;
		margin: 0;
		overflow: auto;
	}
</style>
