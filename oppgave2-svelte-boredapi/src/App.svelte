<script>
	let personNummer = ""
	let kategori = ""

	let activity = { };
		const getActivity = async () => {
		const response = await fetch(`https://www.boredapi.com/api/activity?participants=${personNummer}&type=${kategori}`)
		const json = await response.json ()
		activity = json
	} //Arrow function
	getActivity()
	//async betyr at man skal vente på noe og da bruker man await
</script>

<main>
	<div>
	<h1>Activities</h1>
	<select bind:value={personNummer}>
		<option value='1'>1 person</option>
		<option value='2'>2 persons</option>
		<option value='3'>3 persons</option>
	</select>
	<select bind:value={kategori}>
		<option value='music'>music</option>
		<option value='charity'>charity</option>
		<option value='social'>social</option>
		<option value='social'>education</option>
		<option value='social'>relaxation</option>
	</select>
	<button on:click={getActivity}>Find Activity</button>
	</div>
		
<section>
	{#if activity}
	<div>
		<h2>{activity.activity}</h2>
		<p>Type: {activity.type}</p>
		<p>Accessibility: {activity.accessibility}</p>
		<p>Participants: {activity.participants}</p>
		<p>Link: {activity.link}</p>
	</div>
	{:else}
		<p>Loading Activity......</p>
	{/if}
</section>
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