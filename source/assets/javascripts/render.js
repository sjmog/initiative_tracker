const Render = function(tracker) {
  const component = new TrackerComponent(tracker)
  
  Elements().main.append(component.render())
}