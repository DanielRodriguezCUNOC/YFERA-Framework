<script>
	import NodoArbol from "./NodoArbol.svelte";

	let { tree, activeNodeId, expandedIds, onSelectFile, onToggleFolder } =
		$props();
</script>

<aside class="files-panel">
	<div class="files-head">
		<h2>Arbol de trabajo</h2>
	</div>

	<ul>
		{#each tree as node (node.id)}
			<NodoArbol
				{node}
				level={0}
				{activeNodeId}
				{expandedIds}
				{onSelectFile}
				{onToggleFolder}
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

	ul {
		list-style: none;
		padding: 0.45rem;
		margin: 0;
		overflow: auto;
	}
</style>
