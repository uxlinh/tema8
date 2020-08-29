mapboxgl.accessToken = DIN_API_KEY

var map = new mapboxgl.Map({
    container: 'kart',
    style: 'mapbox://styles/mapbox/navigation-guidance-day-v4',
    zoom: 12,
    center:[10.703266, 59.926824],
    });

    map.addControl(
        new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true  
            }, 
            trackUserLocation: true
        })
    );
    var nav = new mapboxgl.NavigationControl()
    map.addControl(nav, 'top-left')