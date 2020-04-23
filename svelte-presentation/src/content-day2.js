export const words = [
    {text:`Programming is the act of constructing a program—a set of precise instructions telling a computer what to do. Because computers are dumb, pedantic beasts, programming is fundamentally tedious and frustrating.<hr><h5>Eloquent Javascript</h5>`},
    {title: 'Arrow functions', 
    text:`Moderne javascript - ES6 - kom i 2016`}, 
    {   title:'Ny syntaks',
        code:
        `
        function hejsa(name){
            return 'Hejsa ' + name
        }
        →
        <b>const hejsa = name => 'Hejsa' + name</b>
        `
    },
    {   title:'Nye array funksjoner',
        code:
        `
        var array = [1, 23, 3, 4, 52]
        var plusSixAndBetter = []

        for(i=0; i < array.length; i++){
            plusSixAndBetter.push(array[i] + 6)
        }
        →
        <b>plusSixAndBetter = array.map( item => item + 6)</b>
        
        //output from both: [7, 30, 9, 11, 59] 
        `
    },
    {title:'dere må lære tre ting:', text:'<li>Arrow function synax</li><li>Array.map()</li><li>Array.filter()</li>'},
    {title:'Oppgaver', img:'./assets/oppgavesett.png', link:'https://paper.dropbox.com/doc/Oppgavesett-Modern-javascript-Tema-8--AylJ7HhgBEXsJdcaBrAXgZyfAQ-nwb6zOoe1Zm9A22G2lZJW'},
    {title:'Eloquent javascript', img:'./assets/eloquent.png', link:'http://eloquentjavascript.net'},
    {title:'Javascript info', img:'./assets/info.png', link:'http://javascript.info'},

    {title:'the end'}
]
