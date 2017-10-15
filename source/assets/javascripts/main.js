//------------------------------------
//	#Bootstrap JS Components
//------------------------------------

//= require popper
//= require bootstrap-sprockets
//= require ./agent
//= require ./tracker
//= require ./elements
//= require ./render

let kobold = new Agent("Kobold", 12, 7)
let jef = new Agent("Jef", 17, 21)
let tracker = new Tracker

tracker.add(kobold)
tracker.add(jef)

const elements = new Elements
const render = new Render(elements, tracker)

render.tracker()
