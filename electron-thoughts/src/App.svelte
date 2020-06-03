<script>
	//steps: choose | writeletgo | writekeep | acceptletgo | acceptkeep | random | intospace
	let step = 'choose'
	let keepthought
	let letgothought
	let randomThought
	const setRandom = () => {
		randomThought = thoughts[Math.floor( Math.random() * thoughts.length)]
	}
	let thoughts = []
	const getRandom = () => {
		let nr = Math.ceil( Math.random() * thoughts.length)
		console.log(nr)
		return thoughts[ nr ]
	}
	$: console.log(thoughts)

</script>

<main>
	{#if step == 'choose'}
	<div class="choose">	
		<div class="letgo">
			<h5>tekst</h5>
			<button on:click={()=>step='writeletgo'}>let go</button>
		</div>
		<div class="keep">
			<h5>tekst</h5>
			<button on:click={()=>step='writekeep'}>keep</button>
		</div>
	</div>
	{/if}	
	{#if step=='writeletgo'}
		<div class="writeletgo">
			<h1>let go</h1>
			<textarea cols="30" rows="10" bind:value={letgothought} />
			<button on:click={()=>step='acceptletgo'}>I have recognised my thoughts</button>
		</div>
	{/if}
	{#if step=='acceptletgo'}
		<div class="acceptletgo">
			<h1>Accept let go</h1>
			<p>{letgothought}</p>
			<button on:click={()=> { step='intospace'; letgothought = '' } }>into space</button>
		</div>
	{/if}
	{#if step=='intospace'}
		<div class="intospace">
			<h1>into space</h1>
			<button on:click={()=>step='choose'}>back to choose</button>
		</div>
	{/if}
	{#if step=='writekeep'}
		<div class="writekeep">		
			<h1>keep</h1>
			<textarea cols="30" rows="10" bind:value={keepthought} />
			<button on:click={() => { step='acceptkeep'; thoughts = [keepthought, ...thoughts]; }}>Keep thought</button>
		</div>
	{/if}
	{#if step=='acceptkeep'}
		<div class="acceptkeep">
			<h1>accept keep</h1>
			<p>{keepthought}</p>
			<button on:click={ ()=> { keepthought = ''; step='choose' } }>more thoughts</button>

			<button on:click={()=> { step='random'; keepthought = ''; setRandom() } }>random</button>		
		</div>
	{/if}
	{#if step=='random'}
		<div class="random">
			<p>{randomThought}</p>	
			<button on:click={ ()=> { step='choose' } }>forfra</button>		
			//debug hvorfor dette ikke funker
			<button on:click={ ()=> { ()=>setRandom() } }>random</button>		
		</div>
	{/if}
</main>

<style>
	main{
		height:100vh;
		width:100vw;
		display:grid;
		place-items:center;
	}
	.choose{
		display:grid;
		grid-template-columns: 1fr 1fr;
		place-items:center;
	}
	.writeletgo{
		display:grid;
		place-items:center;
	}
	div{
		width:100%;
		height:100%;
	}
</style>
