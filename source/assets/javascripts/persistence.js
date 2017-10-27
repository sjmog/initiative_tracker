const Persistence = function() {
  this.save = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data))
  }

  this.loadTracker = () => {
    const tracker = new Tracker
    tracker.load(JSON.parse(localStorage.getItem('agents')))
    return tracker
  }

  this.loadCreatures = () => {
    return JSON.parse(localStorage.getItem('creatures'))
  }

  return {
    save: this.save,
    loadTracker: this.loadTracker,
    loadCreatures: this.loadCreatures
  }
}()