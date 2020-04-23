console.log('i am here')

function square(tall, name) {
    return name + ', regnestykket ditt gir:' + tall * tall
}

console.log (square(16, 'Per'))

const squareA = (tall) => tall * tall


console.log(squareA(17))

// Hvis vi har flere parametre
const fler = (name1, name2) => 'Hei ' + name1 + ' og' + name2

console.log(fler('Simon', 'Per'))

setTimeout(() => document.querySelector('body').style.backgroundColor='orange', 2000)

/* 
    function antallTegn(ord) {
    return 'Dette ord har ' + ord.length + ' karakterer'
    }

 */

//Fasit
const antallTegn = ord => 'dette ord har ' + ord.length + ' karakterer'

console.log(antallTegn('Antall tegn denne setningen'))


const tallene = [12, 2, 4, 56, 5, 34, 34, 34]

for (i=0; i < tallene.length; i++) {
    console.log(tallene[i])
}

console.log(tallene[4])
// i er numerisk variabel som er midlertidig


//map funksjon som gjør det kjapt å gå gjennom funksjonene. denne er viktig 
let body = document.querySelector('body')

tallene.map( tall => {
    let newLi = document.createElement('li')
    newLi.innerHTML = tall 
    body.appendChild(newLi)
})

const ordene = ['løver', 'katter', 'elefanter', 'oligarker', 'prinser']

/* ordene.map ( ord => {
    console.log('det satt to ' + ord + 'på et bord')
}) */

let str = ''
ordene.map( ord => {
    str += `<section>Det satt to ${ord} på et bord</section>`
})

body.innerHTML = str