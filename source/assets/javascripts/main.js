//------------------------------------
//	#Bootstrap JS Components
//------------------------------------

//= require popper
//= require bootstrap-sprockets
//= require ./agent
//= require ./tracker

//= require ./components/app
//= require ./components/tracker
//= require ./components/agent
//= require ./components/property

//= require ./elements

const App = new AppComponent(Elements.main, new Tracker)
