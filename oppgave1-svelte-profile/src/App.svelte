<script>
	let forrett  
	let hovedrett
	let dessert 
	let step = 'registrer'
</script>
	

<main>
	{#if step == 'registrer' }
	<h1>Registrer deg som bruker</h1>
	<label>Forrett</label>
	<input placeholder="Skriv inn forrett" type="text" bind:value={forrett}> 
	<br>
	<span>Hovedrett</span>
	<input placeholder="Skriv inn hovedrett" type="text" bind:value={hovedrett}>
	<br>
	<span>Dessert</span>
	<input placeholder="Skriv inn Dessert" type="text" bind:value={dessert}>
	
	<button on:click={ ()=> { step='kvittering' } }>Registrer</button>	
	{/if}
	
	 
	{#if step == 'kvittering' }
	<h4>Din bestilling:</h4>
	<ol> 
		<li>Forrett: {forrett}</li>
		<li>Hovedrett: {hovedrett}</li>
		<li>Dessert: {dessert}</li>
	</ol>
	<button on:click={ ()=> { step='registrer' } }>Kanseller Registrering</button>	
	<button on:click={ ()=> { step='registrer' } }>Tilbake</button>	
	<button on:click={ ()=> { step='bekreftet' } }>Bekreft</button>	
	{/if}
	
	{#if step == 'bekreftet' }
	<h4>Bekreftet</h4>
	{/if}
</main>




<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>