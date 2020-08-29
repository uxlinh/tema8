<script>

let stock_id
let card

//get card stock
fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1')
	.then(res=>res.json())
	.then(json => stock_id = json.deck_id)

//draw a card
const getCard = () => {
	fetch(`https://deckofcardsapi.com/api/deck/${stock_id}/draw/?count=1`)
	.then(res=>res.json())
	.then(json=>
		{
			console.log(json)
			card = json.cards[0]
		}
	)
}

let response = 'dette må dere gjøre'

$: if(card){
	if(card.code.includes('6')){
		response = 'waterfall'
	}
	if(card.code.includes('S')){
		response = 'Alle med svarte klær må drikke'
	}
}



//sett op en knapp som ved klik henter et kort og viser det på skærmen
//ha en funksjone som evaluerer hva som skal skje 

</script>

<main>
	<button on:click={getCard}>hent kort</button>
	{#if card}
	<div class="card">	
		<h2>{card.code}</h2>
		<img src={card.image} alt={card.code} >
		<p>{response}</p>
	</div>
	{:else}
		<p>Klik knapp to get card</p>
	{/if}
</main>

<style>
</style>