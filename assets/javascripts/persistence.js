const Persistence = function() {
  this.save = (tracker) => {
    localStorage.setItem('agents', JSON.stringify(tracker.index()))
  }

  this.load = () => {
    const tracker = new Tracker
    tracker.load(JSON.parse(localStorage.getItem('agents')))
    return new AppComponent(Elements.main, tracker)
  }

  return {
    save: this.save,
    load: this.load
  }
}()
;
