<script>
	import { apikeys } from '/Users/simo018/Documents/GitHub/00api_keys/apikeys.js'
	let map
	const init = () => {
		mapboxgl.accessToken = apikeys.mapbox.api_key
		map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/mapbox/streets-v8',
		})
		map.addControl(new mapboxgl.NavigationControl())
	}
	let nightMode, directions = false
	const toggleNightMode = node => {
		if (nightMode) {
			map.setStyle('mapbox://styles/mapbox/streets-v8')
			nightMode = false
		} else {
			map.setStyle('mapbox://styles/mapbox/dark-v8')
			nightMode = true
		}
	}
	let directionCtrl
	const toggleDirections = node => {
		if (!directions) {
			directionCtrl = new MapboxDirections({
				accessToken: mapboxgl.accessToken
			})
			map.addControl(
				directionCtrl,
				'top-left'
			)
			directions = true
		} else {
			map.removeControl(directionCtrl)
			directions = false
		}
	}

	const addMarker = node => {
		const marker = new mapboxgl.Marker({
			draggable: true
		})
		marker.setLngLat(map.getCenter())
		marker.addTo(map)
		marker.on('dragend', () => {
			var bbox = [
				[marker._pos.x - 5, marker._pos.y - 5],
				[marker._pos.x + 5, marker._pos.y + 5]
			]
			var features = map.queryRenderedFeatures(bbox)
			console.log(features)
			var popup = new mapboxgl.Popup({
				offset: 25
			}).setText(
				`Du har sat markeren på ${marker._pos.x}, ${marker._pos.y}`
			)
			marker.setPopup(popup)
		})
	}
</script>

<svelte:head>
	<script on:load={init} src='https://api.mapbox.com/mapbox-gl-js/v1.8.0/mapbox-gl.js'></script>
	<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.0.2/mapbox-gl-directions.js">
	</script>
	<link href='https://api.mapbox.com/mapbox-gl-js/v1.8.0/mapbox-gl.css' rel='stylesheet' />
	<link rel="stylesheet"
		href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.0.2/mapbox-gl-directions.css"
		type="text/css" />
</svelte:head>

<main>
	<div>
		<div id='map' />
		<div class='controls'>
			<div on:click={ toggleNightMode } class:active={nightMode}>night mode</div>
			<div on:click={ toggleDirections } class:active={directions}>directions</div>
			<div on:click={ addMarker }>add marker</div>
		</div>
	</div>
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
		display: grid;
		place-items: center;
	}

	#map {
		width: 60vw;
		height: 60vh;
	}

	.active,
	.controls>div:active {
		background: black;
		color: white;
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: .2rem;
		padding: .2rem .2rem 0 0;
	}

	.controls>div {
		padding: .4rem;
		text-align: center;
		cursor: pointer;
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