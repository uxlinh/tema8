<script>
	import {fade, fly, scale} from 'svelte/transition'; 
	import { CloseSquareOutlineIcon } from 'svelte-eva-icons'
	import { ChevronLeftIcon } from 'svelte-eva-icons'
	//steps: choose | writeletgo | writekeep | acceptletgo | acceptkeep | random | intospace
	let step = 'choose'
	let letgothought = ''
	let keepthought = ''

	$: characters = letgothought.length
	$: words1 = letgothought.split(" ").length

	$: characters = keepthought.length
	$: words2 = keepthought.split(" ").length

	let thoughts = []
	let addThoughts = () => {
		thoughts = [keepthought, ...thoughts]
	}

	let removeThought = (index) => {
		thoughts.splice(index, 1)
		thoughts = thoughts;
	}

	const bgAccept = './assets/acceptletgo.png'
	const bgSpace = './assets/space.jpg'
	const bgKept = './assets/kept.png'
     

	let showFav
</script>





<body>
<main>
	{#if step=='choose'}
	<div class="logo"><img src="./assets/feelfinelogo.svg" alt="Logo"></div>	
	<div class="choose">
		<div class="letgo">
			<h1 class="h1-start">Got some intrusive thoughts you want to let go?</h1>
			<button in:fade class="btn-start" on:click={()=>step='writeletgo'}>Let go</button>
			<img class="img-letgo" src="./assets/dandelion.png" alt="Let Go Picture">
		</div>

		{#if !showFav} 
			<div class="keep">
				<h1 class="h1-start">Got some positive thoughts you want to keep?</h1>
				<button in:fade class="btn-start" on:click={()=>step='writekeep'}>Keep</button>
			{#if thoughts.length > 0}
				<button class="btn-start" in:fade on:click={()=>step='kept'}>Kept</button>
			{/if}
				<img class="img-keep" src="./assets/keep.png" alt="Keep Picture">
			</div>
		{/if}

	</div>
	{/if}

<!-- Let go -->
	{#if step=='writeletgo'}
		<!-- <div class="logo"><imga src="./assets/logo.svg" alt="Logo"></div> -->
		<div class="writeletgo">
			<div class="back" on:click={()=> { step='choose'; letgothought = '' } }><ChevronLeftIcon/></div>
			<h1 class="h1-write">Recognize your thoughts and write them down</h1>
			<textarea cols="45" rows="10"  bind:value={letgothought} placeholder="Write down your thoughts..."/>
			<p>Words: {words1}</p>
			<button class="btn-accept" on:click={()=>step='acceptletgo'}>I have recognised my thoughts</button>
		</div>
	{/if}
	{#if step=='acceptletgo'}
		<div class="acceptletgo" style="background-image: url('{bgAccept}')">
				<div class="back" on:click={()=> { step='writeletgo'} }><ChevronLeftIcon/></div>
				<div class="acceptGuidance">
					<p class="acceptText" in:fade><q id="b">{letgothought}</q></p>
				</div>
				<div class="acceptGuidance">
					<h1 class="h1-write">Accept & Let go</h1>
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
			<div class="back" on:click={()=> { step='choose'; letgothought = '' } }><ChevronLeftIcon/></div>
			<div class="intospace" style="background-image: url('{bgSpace}')">
				<h1>Your thoughts are flown into space</h1>
				<button on:click={()=> step='choose'}>Back to home</button>
			</div>
		

	{/if}






<!-- Keep -->
	{#if step=='writekeep'}
		<div class="back" on:click={()=> { step='choose'; keepthought = '' } }><ChevronLeftIcon/></div>
		<div class="writekeep">		
			<h1 class="h1-write">Write a positive thought or feedback you have received. For example: “What would your friends say about you?”</h1>
			<textarea cols="45" rows="10" placeholder="Write something positive about yourself..." bind:value={keepthought} />
			<p>Words: {words2}</p>
			<button on:click={ () => { step='acceptkeep'; addThoughts(); }}>Keep thoughts</button>
		</div>
	{/if}

	{#if step=='acceptkeep'}
		<div class="back" on:click={()=> { step='writekeep' } }><ChevronLeftIcon/></div>
		<div class="acceptkeep">
			<div class="acceptGuidance">
					<p class="acceptText"><q id="b">{keepthought}</q></p>
			</div>
			<div class="acceptGuidance">
					<h1 class="h1-write">Kept it!</h1>
					<p>Your positive thoughts/feedback are kept for future review. They can provide you warm feelings for good and bad days.</p>
					<button on:click={ ()=> { step='writekeep'; keepthought = '' } }>Keep more positive thoughts</button>		
					<button on:click={ ()=> { step='kept'; keepthought = '' } }>See kept thoughts</button>		
			</div>
		</div>
	{/if}

	{#if step=='kept'}
		<div class="back" on:click={()=> { step='acceptkeep' } }><ChevronLeftIcon/></div>
		<div class="kept" style="background-image: url('{bgKept}')">
			<h1>Kept thoughts</h1>
			{#each thoughts as thought, index}
				<div class="keptThoughts">
					<div class="keptThoughts-item1">
						<p class="keptThoughts-text" in:fade out:fade> <q id="b">{thought} </q> </p>
						<div class="close" out:fade hover:red on:click={() => removeThought(index)}>
							<CloseSquareOutlineIcon/>
						</div>	
					</div>
				</div>	
			{/each} 
			<button on:click={ ()=> { step='choose' } }>Back to home</button>	
		</div>
	{/if}
</main>

</body>



<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400&display=swap');

	*,
	*::after,
	*::before,
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
		font-family: poppins;
	}
	.logo {
		position: absolute;
		display: flex;
		width: 100vw;
		height: 15vh;
		top: 0rem;
		align-items: center;
		justify-content: center;
	}
	.close {
		height: 2rem;
		max-width: 2rem;
		fill: rgba(245, 245, 245, 0.801);
	}
	.close:hover{
		fill: white;
	}
	.back {
		height: 3rem;
		width: 3rem;
		position: absolute;
		display: flex;
		align-items: center;
		top: 1.8rem;
		left: 1rem;
		z-index: 1;
		fill: rgba(245, 245, 245, 0.801);
	}
	.back:hover{
		fill: white;
	}
	img {
		width: 18%;
	}
	.choose{
		display:grid;
		grid-template-columns: 1fr 1fr;
		text-align: center;
	}
	.letgo, .writeletgo, .acceptletgo{
		background-color: #495D5A;
	}
	.kept, .keep, .writekeep, .acceptkeep {
		background-color: rgb(213, 184, 97);
	}
	.writeletgo, .acceptGuidance, .writekeep, .kept, .intospace {
		background-repeat: no-repeat;
  		background-size: cover;
		height:100vh;
		display:flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}
	.kept {
		height:100vh;
		width:100vw;
		display:grid;
		place-items:center;
	}
	div.keptThoughts {
		display:grid;
		grid-template-columns: 1fr;
		place-items: center;
		max-width: 40rem;
	}
	div.keptThoughts-item1{
		display: flex;
		align-items: center;
		justify-content: center;
		max-width: 35rem;
	}
	/* div.keptThoughts-item2{
		display: flex;
		align-items: center;
		max-width: 5rem;
	} */
	.acceptletgo, .acceptkeep {
		display:grid;
		grid-template-columns: 1fr 1fr;
		text-align: center;
		background-size: cover;
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

	button, textarea, p.acceptText, p.keptThoughts-text {
		padding: 0.8rem;
		font-size: 1rem;
		font-weight: 300;
		border-radius: 0.8rem;
		border: 0;
	}
	textarea, p.acceptText, p.keptThoughts-text{
		background-color: rgba(245, 245, 245, 0.651)
	}
	button {
		margin-top: 1rem;
		background-color: rgba(245, 245, 245, 0.836);
	}
	button:hover{
		background-color: white;
		cursor: pointer;
	}
	.btn-start {
		z-index: 1;
		position: relative;
		top: 6.6rem;
	}

	div{
		width:100%;
		height:100%;
	}
	h1 {
		font-family: poppins;
		font-weight: 200;
		font-size: 1.6rem;
		text-align: center;
		margin-top: 1rem;
		margin-bottom: 1rem;
		color: white;
		padding: 0rem 2rem;
	}
	.h1-start {
		z-index: 1;
		position: relative;
		top: 7rem;
	}
	.h1-write{
		font-size: 1.5rem;
	}
	p {
		font-weight: 200;
		font-size: 1.1rem;
		margin: 0.5rem;
		color: white;
	}

	#b {
  		quotes: "“" "„";	
		color: black;
	}

</style>