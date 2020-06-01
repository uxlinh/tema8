<script>

	import { time } from './stores.js';
	let alarm = new Date()

	const formatter = new Intl.DateTimeFormat('en', {
		hour12: true,
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit'
	});

	let kanjegfaais = true
	let visbeskjed = false

	$: beskjed = kanjegfaais ? 'Ja, du kan få is!!!' : 'Nei, nå må du vente enda lengre'
	$: kanjegfaais = alarm < $time ? true : false

	let foreldreKontroll = 30
	const faaIs = (event) => {
		visbeskjed = true
		if(kanjegfaais) {
			event.target.src = './assets/hurra.png'
		} else{
			event.target.src = './assets/kid.jpg'
		}
		setTimeout (()=> {
			event.target.src = './assets/is.png'
			visbeskjed = false
			alarm = new Date (new Date().getTime() + foreldreKontroll * 60000)
		}, 5000)	
	}
</script>

<main>
	<img src="./assets/is.png" alt="iskrem" on:click={faaIs}/>
	{#if visbeskjed}
		<h1>{beskjed}</h1>
	{/if}

</main>

<style>

	:global(*) {
		box-sizing: border-box;
	}

	main {
		display: grid;
		place-items: center;
		padding: 10vw;
		position: relative;
	}
	img{
		width: 40vw;
	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
		position: absolute;
		bottom: 0rem;
	
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>