import Shakespeare from './data/shakespeare.js'
let quotes = document.querySelector('#quotes')
let inp = document.querySelector('#search')


const showQuote = (quote, div) => {
    let article = document.createElement('article')
    let p = document.createElement('p')
    p.innerHTML = quote
    article.appendChild(p)
    div.appendChild(article)
}

showQuote(Shakespeare.phrases[5], quotes)
showQuote(Shakespeare.phrases[10], quotes)
showQuote(Shakespeare.phrases[10], quotes)

Shakespeare.phrases.map(
    quote => showQuote(quote, quotes)
)

const filterQuotes = () => {
    let filtered = Shakespeare.phrases.filter(
        quote => quote.toLowerCase().includes(inp.value)
    )
    quotes.innerHTML = ''
    filtered.map( quote => showQuote(quote, quotes))
    
}
inp.addEventListener('input', filterQuotes)
//map funksjonen løper gjennom et array array.map()

//(quote, div) er to parametre

//tenke algoritmisk - lage en funksjon som viser et sitat. 