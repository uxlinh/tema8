<script>
    let q 
    const limit = 1
    let apiKey = 'LHapcAM6q9szwBHIjLL8yUQtcTFSHleE'

    let gif

const getImage = () => {
    fetch(`https://api.giphy.com/v1/gifs/search?q=${q}&limit=${limit}&apiKey=${apiKey}`) 
    .then( res => res.json() )
    .then( json => {
        gif = json.data[0].images.downsized_medium.url
        console.log(json)
        })
}
    
</script>

<main>
    {#if getImage}
        <h1>Finn din favoritt GIF</h1>
        <input bind:value={q} type="text" name="search" id="search">
        <button on:click={getImage}>Hent bilde</button>
        <img src="{gif}" alt="{q}">    
    {:else}
        <h2>Fetching image</h2>
    {/if}

    
</main>

<style>
    main{
        display: flex;
        flex-flow: column;
        align-items: center;
    }
</style>