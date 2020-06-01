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
	$: console.log(thoughts)


	const bgAccept = './assets/acceptletgo.png'
	const bgSpace = './assets/space.jpg'
	const bgKept = './assets/kept.png'
</script>



<body>
	
<main>
	{#if step=='choose'}
	<div class="choose">	
		<div class="letgo">
			<h1 class="h1-start">Got some intrusive thoughts you want to let go?</h1>
			<button class="btn-start" on:click={()=>step='writeletgo'}>Let go</button>
			<img class="img-letgo" src="./assets/dandelion.png" alt="Let Go Picture">
		</div>
		<div class="keep">
			<h1 class="h1-start">Got some positive thoughts you want to keep?</h1>
			<button class="btn-start" on:click={()=>step='writekeep'}>Keep</button>
			<img class="img-keep" src="./assets/keep.png" alt="Keep Picture">
		</div>
	</div>
	{/if}

<!-- Let go -->
	{#if step=='writeletgo'}
		<div class="writeletgo">
			<h1>Recognize your thoughts and write them down</h1>
			<textarea cols="45" rows="15" bind:value={letgothought} placeholder="Write down your thoughts..."/>
			<button on:click={()=>step='acceptletgo'}>I have recognised my thoughts</button>
		</div>
	{/if}
	{#if step=='acceptletgo'}
		<div class="acceptletgo" style="background-image: url('{bgAccept}')">
				<div class="acceptGuidance">
					<p class="acceptText"><q id="b">{letgothought}</q></p>
				</div>
				<div class="acceptGuidance">
					<h1>Accept & Let go</h1>
					<p>Accept the thoughts and feelings you have.</p>
					<p>Do not give the thoughts too much room, just enough attention and accept that they exist.
					</p>
					<p>But leave them alone. 
					</p>
					<button on:click={()=> { step='intospace'; letgothought = '' } }>Accept & Let go</button>
				</div>
		</div>
	{/if}
	{#if step=='intospace'}
		<div class="intospace" style="background-image: url('{bgSpace}')">
			<h1>Your thoughts are flown into space</h1>
			<button on:click={()=>step='choose'}>Add more thoughts</button>
		</div>
	{/if}

<!-- Keep -->
	{#if step=='writekeep'}
		<div class="writekeep">		
			<h1>Write a positive thought or feedback you have received. For example: “What would your friends say about you?”</h1>
			<textarea cols="45" rows="15" bind:value={keepthought} />
			<button on:click={ () => { step='acceptkeep'; thoughts = [keepthought, ...thoughts]; }}>Keep thoughts</button>
		</div>
	{/if}
	{#if step=='acceptkeep'}
		<div class="acceptkeep" style="background-image: url('{bgKept}')">
			<h1>Kept it!</h1>
			<p><span>"</span>{keepthought}<span>"</span></p>
			<div class="btn-acceptkeep">
				<button on:click={ ()=> { step='choose' } }>Back to home</button>	
				<button on:click={ ()=> { keepthought = ''; step='writekeep' } }>Keep more positive thoughts</button>		
				<button on:click={ ()=> { step='kept'; keepthought = ''} }>See your kept thoughts</button>
			</div>		
		</div>
	{/if}
	{#if step=='kept'}
		<div class="kept" style="background-image: url('{bgKept}')">
		<h1>Kept thoughts</h1>
		{#each thoughts as thought}
			<p>"{thought}"</p>	
		{/each}
			<button on:click={ ()=> { step='choose' } }>Back to home</button>	
		</div>
	{/if}
</main>

</body>



<style>
	@import url("https://fonts.googleapis.com/css?family=IBM+Plex+Mono:400,700&display=swap");
	
	*,
	*::after,
	*::before {
 	margin: 0;
  	padding: 0;
	}

	:global(body) {
		margin: 0;
		padding: 0;
	}

	main{
		height:100vh;
		width:100vw;
		display:grid;
		place-items:center;
		margin: 0;
  		padding: 0;
	}
	.choose{
		display:grid;
		grid-template-columns: 1fr 1fr;
		text-align: center;
	}
	.writeletgo, .acceptGuidance {
		height:100vh;
		display:flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}
	.acceptletgo {
		display:grid;
		grid-template-columns: 1fr 1fr;
		text-align: center;
		background-size: cover;
	}
	.letgo, .writeletgo, .acceptletgo{
		background-color: #495D5A;
	}
	.keep, .writekeep {
		background-color: #E0C87E;
	}
	.intospace, .writekeep, .acceptkeep, .kept  {
		background-size: contain;
		display:flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}

	.img-keep, .img-letgo {
		width: 50%;
		height: 48.5%;
		position: absolute;
		bottom: 0;
	}
	.img-letgo{
		left: 0;
	}
	.img-keep{
		right: 0;
	}

	button, textarea, p.acceptText {
		margin: 0.8rem;
		padding: 1rem;
		border-radius: 0.8rem;
		border: 0;
		background-color: rgba(245, 245, 245, 0.836)
	}
	.btn-start {
		z-index: 1;
		position: relative;
		top: 7rem;
	}
	.btn-acceptkeep {
		text-align: center;
	}
	div{
		width:100%;
		height:100%;
	}

	h1 {
		font-family: Arial, Helvetica, sans-serif;
		font-weight: 100;
		font-size: 2rem;
		text-align: center;
		margin: 1rem;
		color: white;
		padding: 0rem 2rem;
	}
	.h1-start {
		z-index: 1;
		position: relative;
		top: 7rem;
	}

	#b {
  		quotes: "“" "„";	
		color: black;
	}
	p {
		margin: 1rem;
		color: white;
	}

</style>