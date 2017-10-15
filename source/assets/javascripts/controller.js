const Controller = function(tracker, elements) {
  this.tracker = tracker

  this.start = () => {
    let render = new Render(elements, tracker)
    render.tracker()
  }
}