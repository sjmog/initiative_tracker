//------------------------------------
//	#Bootstrap JS Components
//------------------------------------

//= require popper
//= require bootstrap-sprockets

//= require ./vendor/select2.min

//= require ./data/creatures

//= require ./persistence
//= require ./roll
//= require ./modifier
//= require ./agent
//= require ./tracker

//= require ./components/app
//= require ./components/headers
//= require ./components/tracker
//= require ./components/agent
//= require ./components/property
//= require ./components/creature_selector
//= require ./components/save
//= require ./components/load

//= require ./elements

let tracker = new Tracker
let App = new AppComponent(Elements.main, tracker)
