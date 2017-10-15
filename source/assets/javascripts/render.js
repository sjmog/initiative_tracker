const Render = function(elements, tracker) {
  this.tracker = () => {
    const component = new TrackerComponent(tracker)
    elements.main.append(component.render())
  }
}