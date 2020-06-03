
const activity = document.querySelector('.activity')
const button = document.querySelector('#button')
const title = document.querySelector('#title')
const type = document.querySelector('#type')
const accessibility = document.querySelector('#accessibility')
const price = document.querySelector('#price')
const participants = document.querySelector('#participants')
const link = document.querySelector('#link')


button.addEventListener('click', () => {
    fetch('https://www.boredapi.com/api/activity') //asynkron funksjon
        .then( res => res.json() ) //res = response, then er også en asynchron funksjon
            .then( json => { //kunne kalt json for noe annet
                console.log(json)
                title.innerHTML = json.activity
                type.innerHTML = json.type ? json.type : ''
                accessibility.innerHTML = json.accessibility ? json.accessibility : ''
                price.innerHTML = json.price ? json.price + '$' : ''
                link.innerHTML = json.link ? json.link  : ''
                participants.innerHTML = json.participants ? 'Participants: ' + json.participants  : ''
                activity.style.opacity = 1
            } )
})