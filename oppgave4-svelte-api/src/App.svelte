<script>
    import {fade, fly, scale} from 'svelte/transition';
    import {HeartIcon} from 'svelte-eva-icons' 

    let q 
    const limit = 1
    let apiKey = 'LHapcAM6q9szwBHIjLL8yUQtcTFSHleE'

    let gif 
    let favorites = []

    const addToFav = (gif) => {
    if(!favorites.includes(gif)){
        favorites = [gif, ...favorites]
    }else{
        favorites = favorites.filter( element => element != gif) 
    } 
    }

    let showFav = false

    const getImage = () => {
        gif = null
        fetch(`https://api.giphy.com/v1/gifs/search?q=${q}&limit=${limit}&apiKey=${apiKey}`) 
        .then( res => res.json() )
        .then( json => {
            gif = json.data[0].images.downsized_medium.url
            console.log(json)
            })
    }
    
</script>

<main>
    {#if !showFav} 
    {#if getImage}
        <h1>Finn din favoritt GIF</h1>
        <input bind:value={q} type="text" name="search" id="search" placeholder="Type to search" on:keydown={ event => event.key == 'Enter' ? getImage() : ''} on:click={ e=> e.target.value=''} on:focus={ e=> e.target.value=''}>
        <button on:click={getImage}>Hent bilde</button>
        {#if favorites.length > 0}
            <button in:scale on:click={ () => showFav = !showFav}>
                { showFav ? 'skjul favoritter' : 'vis favoritter'}
            </button>
        {/if}
    
        <img in:fade src="{gif}" alt="{q}">
        <div class='heart' on:click={()=>addToFav(gif)} style={favorites.includes(gif) ? 'fill:red' : 'fill:gray'}>
        <HeartIcon />
        </div>    
    {:else}
        <h2>Fetching image</h2>
    {/if}

    {:else} 
        <div in:fly={{x:1000}} class="favorites">
            {#each favorites as fav}
                <img src='{fav}' alt='giffy'>
            {/each}
        </div>
    {/if}  
</main>

<style>
    main{
        
        display:grid;
        place-items:center;

        height:100%;
        position:relative;
    }

.favorites{
    max-height:60vh;
    overflow:scroll;
    display:grid;
    gap:.2rem;
    grid-template-columns:repeat(4, 200px);
}
.favorites img{
    width:100%;
    height:200px;
    object-fit:cover;
}
.heart{
    position:absolute;
    bottom:2rem;
    height:4rem;
    width:4rem;
    fill:gray;
}
img{
    max-height:40vh;
    width:60vw;
    object-fit: cover;
}
</style>