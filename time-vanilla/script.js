import colors from './data/colors.js'

let main = document.querySelector('main')
let circle = document.querySelector('#circle')


let showAlarmButton = document.querySelector('#showAlarm')
let alarmDiv = document.querySelector('#alarm')
showAlarmButton.addEventListener('click', ()=>{
    alarmDiv.style.transform = 'translateX(0)'
})


let setAlarmButton = document.querySelector('#setAlarm')
let alarmSet = false
let alarmTime = {}
setAlarmButton.addEventListener('click', ()=>{
    let hours = document.querySelector('#hours').value
    let minutes = document.querySelector('#minutes').value
    alarmSet = true
    alarmDiv.innerHTML = 'alarm set to: ' + hours + ':' + minutes
    alarmTime.hours = hours
    alarmTime.minutes = minutes
})

let pos = 0



const time = () => {
let t = new Date ()
//date er en klasse  
let hours = t.getHours()
let min = t.getMinutes()
let sec = t.getSeconds()
let ms = t.getMilliseconds()

//sec = sec < 10 ? ::: Her spør vi, hvis sec < 10 ? set den da til 0 + seconds : else 

/* 
sec = sec < 10 ?
if(sec < 10){
sec = '0' + sec
}
*/

if(alarmSet) {
    if(alarmTime.hours == hours && alarmTime.minutes == min){
    circle.innerHTML = '<h1>ALARM</h1>'
    return
    }
}


sec = sec < 10 ? '0' + sec:sec

circle.innerHTML = `<h1>${hours}:${min}:${sec}</h1>`
}

//let timer = setInterval(time, 100 millisekunder)

const setColor = () => {
    circle.style.backgroundColor = colors[pos].hex
    if (pos < colors.length -1) {
        pos = pos + 1
    } else{
        pos = 0
    }
}

let timer = setInterval(time, 1000)
// let timer2 = setInterval(setColor, 5000)= bytter farge på sirkelen hvert 5.sekund
let timer2 = setInterval(setColor, 5000)

//La oss si vi har en klokke, da vil vi sette en alarm