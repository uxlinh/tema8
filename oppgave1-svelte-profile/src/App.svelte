<script>
	let fornavn  
	let etternavn
	let brukernavn
	let passord 
	let aktivitet
	let skoleVenner 
	let venner
	let step = 'registrer'
	let feedback = 'minimun 7 tegn'
	let minlength = 7

</script>

	


<main>
<!-- Registrer -->
	{#if step == 'registrer' }
			<h1>Registrer deg som bruker</h1>
		<div class="registrer">

			<div class="grid-item">
				<h3>Fornavn*</h3>
			</div>
			<div class="grid-item">
				<input placeholder="Skriv inn fornavn" type="text" bind:value={fornavn}>
			</div> 


			<div class="grid-item">
				<h3>Etternavn*</h3>
			</div>
			<div class="grid-item">
				<input placeholder="Skriv inn etternavn" type="text" bind:value={brukernavn}>
			</div>

			<div class="grid-item">
				<h3>Brukernavn*</h3>
			</div>
			<div class="grid-item">
				<input placeholder="Skriv inn e-post" type="text" bind:value={etternavn}>
			</div>

			<div class="grid-item">
				<h3>Passord*</h3>
			</div>
			<div class="grid-item">
				<input placeholder="Minimum 7 karakterer" type="text" min="7" max="20" bind:value={passord}>
			</div>
		

			<div class="grid-item">
				<h3>Favoritt aktivitet(er)</h3>
			</div>
			<div class="grid-item">
				<input placeholder="F.eks fotball" type="text" bind:value={aktivitet}>
			</div>

			<div class="grid-item">
				<h3>Antall venner på skolen</h3>
			</div>
			<div class="grid-item">
				<input placeholder="F.eks 1" type="number" bind:value={skoleVenner}>
			</div>

			<div class="grid-item">
				<h3>Antall venner totalt</h3>
			</div>
			<div class="grid-item">
				<input placeholder="F.eks 1" type="number" bind:value={venner}>
			</div>

			<div class="grid-item">
				<h3>Jeg aksepterer <a href=" ">vilkår og betingelser</a></h3>
			</div>	
			<div class="grid-item">
				<input type="radio" id="aksept" name="vilkår" value="vilkår">
			</div>	
			
			<div class="grid-item">
				<p>* Påbudt felt</p>
			</div>	
		</div>

			<button on:click={ ()=> { step='kvittering' } }>Registrer</button>
	{/if}
	
	 
<!-- Kvittering -->
	{#if step == 'kvittering' }
			<h1>Bekreft opplysningene</h1>
		<div class="kvittering">

			<div class="grid-item">
				<h3>Fornavn</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{fornavn}</p>
			</div>

			<div class="grid-item">
				<h3>Etternavn</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{etternavn}</p>
			</div>

			<div class="grid-item">
				<h3>Brukernavn</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{brukernavn}</p>
			</div>

			<div class="grid-item">
				<h3>Passord</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{passord}</p>
			</div>

			<div class="grid-item">
				<h3>Favoritt aktivitet(er)</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{aktivitet}</p>
			</div>

			<div class="grid-item">
				<h3>Venner på skolen</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{skoleVenner}</p>
			</div>

			<div class="grid-item">
				<h3>Antall venn(er)</h3>
			</div>
			<div class="grid-item">
				<p class="inp-resultat">{venner}</p>
			</div>


		</div>
		<div class="btn-kvittering">
			<button on:click={ ()=> { step='registrer' } }>Tilbake</button>	
			<button on:click={ ()=> { step='bekreftet' } }>Bekreft</button>	
		</div>
	{/if}
	

<!-- Registrering bekreftet -->
	{#if step == 'bekreftet' }
		<div class="bekreftet">
			<h1>Registrering bekreftet</h1>
		</div>
	{/if}
</main>



<style>
	main {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
		display: flex;
		flex-flow: column;
		align-items: center;
	}

	h1 {
		color: #071982;
		font-size: 3rem;
		font-weight: 100;
	}
	h3 {
		color: #071982;
		margin: 0;
	}
	p {
		color: #071982;
	}
	p.inp-resultat{
		color: #071982;
		margin: 0;
		font-size: 1.2rem;
	}
	a {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		font-weight: 100;
		font-size: 1rem;
		text-decoration: underline;
	}

	.registrer, .kvittering {
		display: grid;
  		grid-template-columns: auto auto;
		grid-gap: 0.7rem;
		max-width: 40rem;
  		background-color: rgb(255, 255, 255);
  		padding: 2rem;
	}
	.grid-item {
		display: flex;
		align-items: center;
		max-width: 14rem;
	}
	input, button {
		margin: 0;
		padding: 0.5rem;
		border: 0.1rem #071982 solid;
		border-radius: 0.5rem;
	}
	::placeholder{
		color: #07198279;
	}
	input {
		max-width: 19rem;
	}
	button{
		background-color: #071982;
		color: aliceblue;
		text-align: right;
	}


	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>