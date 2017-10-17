//------------------------------------
//	#Bootstrap JS Components
//------------------------------------

//= require popper
//= require bootstrap-sprockets

//= require ./vendor/select2.min

//= require ./data/creatures

//= require ./roll
//= require ./modifier
//= require ./agent
//= require ./tracker

//= require ./components/app
//= require ./components/tracker
//= require ./components/agent
//= require ./components/property
//= require ./components/creature_selector

//= require ./elements

let tracker = new Tracker
const App = new AppComponent(Elements.main, tracker)
