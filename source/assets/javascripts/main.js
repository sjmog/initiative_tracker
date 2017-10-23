//------------------------------------
//	#Bootstrap JS Components
//------------------------------------

//= require popper
//= require bootstrap-sprockets
//= require ./vendor/select2.min
//= require ./string

//= require ./data/creatures
//= require ./data/challenge_ratings

//= require ./persistence
//= require ./dice
//= require ./roll
//= require ./modifier
//= require ./ability_scores

//= require ./agent
//= require ./tracker

//= require ./components/app
//= require ./components/button_bar
//= require ./components/initiative_table
//= require ./components/headers
//= require ./components/tracker
//= require ./components/agent
//= require ./components/property
//= require ./components/creature_selector
//= require ./components/creature_option
//= require ./components/save
//= require ./components/load
//= require ./components/info_box
//= require ./components/image
//= require ./components/ability_scores_box
//= require ./components/saving_throws_box
//= require ./components/skills_box
//= require ./components/paragraph
//= require ./components/header

//= require ./elements

let tracker = new Tracker
let App = new AppComponent(Elements.main, tracker)
