<script>
import Activity from './components/Activity.svelte'
let activity = {} 
let show = false
const getActivity = () => {
	show = false
	fetch(`https://www.boredapi.com/api/activity?`)
		.then( res => res.json() )
			.then( json => {
				activity = json
				show = true
				} )
}
</script>



<main>
	<button on:click={getActivity}>hit me</button>
	{#if show}
		<Activity {activity} />
	{:else}
		<h2>Hit me</h2>
	{/if}

</main>

<style>
	main{
		display:grid;
		place-items:center;
		height:100vh;
		position:relative;
	}
	button{
		position:absolute;
		top:2rem;
		background:black;
		color:white;
		cursor:pointer;
	}
</style>