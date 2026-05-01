<script>
	let {
		historialConsola = [],
		errores = [],
		entradaConsola = "",
		conexionActiva = false,
		alCambiarEntrada,
		alEnviarComando,
		alLimpiarConsola,
		alAlternarConexion,
	} = $props();

	let pestanaActiva = $state("consola");
</script>

<section class="console-panel">
	<div class="console-head">
		<div class="tab-switcher">
			<button class:active={pestanaActiva === "consola"} onclick={() => pestanaActiva = "consola"}>Consola DB</button>
			<button class:active={pestanaActiva === "errores"} onclick={() => pestanaActiva = "errores"}>
				Errores {#if errores.length > 0}<span class="badge">{errores.length}</span>{/if}
			</button>
		</div>
		<div class="actions">
			<button class="ghost" onclick={alLimpiarConsola}>Limpiar</button>
			{#if pestanaActiva === "consola"}
				<button class:connected={conexionActiva} onclick={alAlternarConexion}>
					{conexionActiva ? "Desconectar" : "Conectar"}
				</button>
			{/if}
		</div>
	</div>

	<div class="console-body">
		{#if pestanaActiva === "consola"}
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
		{:else}
			<div class="error-table-container">
				{#if errores.length === 0}
					<div class="empty-errors">No se detectaron errores de compilación.</div>
				{:else}
					<table>
						<thead>
							<tr>
								<th>Tipo</th>
								<th>Lexema</th>
								<th>Línea</th>
								<th>Col</th>
								<th>Descripción</th>
							</tr>
						</thead>
						<tbody>
							{#each errores as error}
								<tr>
									<td class="type-cell">{error.tipo}</td>
									<td class="lexeme-cell">{error.lexema}</td>
									<td>{error.linea}</td>
									<td>{error.columna}</td>
									<td class="desc-cell">{error.mensaje}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{/if}
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

	.tab-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.tab-switcher button {
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: #8fa0af;
		font-weight: 700;
		font-size: 0.85rem;
		padding: 0.3rem 0.5rem;
		cursor: pointer;
		text-transform: uppercase;
		border-radius: 0;
	}

	.tab-switcher button.active {
		color: #f28c28;
		border-bottom-color: #f28c28;
	}

	.badge {
		background: #ff5f5f;
		color: white;
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		border-radius: 10px;
		margin-left: 0.3rem;
	}

	.console-body {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		overflow: hidden;
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

	.error-table-container {
		padding: 0;
		overflow: auto;
		background: #0a0f14;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
		color: #d8e3ed;
	}

	th {
		text-align: left;
		background: #161f28;
		padding: 0.6rem;
		position: sticky;
		top: 0;
		color: #8fa0af;
		font-weight: 600;
		border-bottom: 1px solid #2f3a44;
	}

	td {
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid #1a222a;
		vertical-align: top;
	}

	tr:hover {
		background: #1a232e;
	}

	.type-cell {
		color: #ffb061;
		font-weight: 700;
	}

	.lexeme-cell {
		font-family: monospace;
		color: #9ac8ff;
		background: rgba(154, 200, 255, 0.05);
	}

	.desc-cell {
		color: #ff9a9a;
	}

	.empty-errors {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		color: #6a7c8a;
		font-style: italic;
	}
</style>
