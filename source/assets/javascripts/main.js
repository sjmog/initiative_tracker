//------------------------------------
//	#Bootstrap JS Components
//------------------------------------

//= require popper
//= require bootstrap-sprockets
//= require ./agent
//= require ./tracker
//= require ./components/components
//= require ./components/tracker
//= require ./components/agent
//= require ./components/property

//= require ./elements
//= require ./render

let tracker = new Tracker

tracker.add("Kobold", 12, 7)
tracker.add("Jef", 17, 21)

Render(tracker)
