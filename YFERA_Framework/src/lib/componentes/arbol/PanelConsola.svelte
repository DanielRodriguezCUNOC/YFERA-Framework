<script>
	let {
		historialConsola = [],
		entradaConsola = "",
		conexionActiva = false,
		alCambiarEntrada,
		alEnviarComando,
		alLimpiarConsola,
		alAlternarConexion,
	} = $props();
</script>

<section class="console-panel">
	<div class="console-head">
		<h2>Consola DB</h2>
		<div class="actions">
			<button class="ghost" onclick={alLimpiarConsola}>Limpiar</button>
			<button class:connected={conexionActiva} onclick={alAlternarConexion}>
				{conexionActiva ? "Desconectar" : "Conectar"} DB
			</button>
		</div>
	</div>

	<div class="console-output">
		{#each historialConsola as item}
			<p class={item.clase}>{item.text}</p>
		{/each}
	</div>

	<div class="console-input-row">
		<input
			type="text"
			placeholder="Escribe una consulta SQL o comando"
			value={entradaConsola}
			oninput={(event) => alCambiarEntrada(event.currentTarget.value)}
			onkeydown={(event) => event.key === "Enter" && alEnviarComando()}
		/>
		<button onclick={alEnviarComando}>Enviar</button>
	</div>
</section>

<style>
	.console-panel {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		overflow: hidden;
		min-height: 0;
		background: rgba(15, 21, 28, 0.88);
		border-top: 1px solid #2f3a44;
	}

	.console-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.55rem 0.75rem;
		border-bottom: 1px solid #2f3a44;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
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

	@media (max-width: 640px) {
		.console-input-row {
			grid-template-columns: 1fr;
		}

		.console-head {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.6rem;
		}
	}
</style>
