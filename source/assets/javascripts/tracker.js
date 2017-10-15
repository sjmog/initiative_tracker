const Tracker = function() {
  this.agents = []
  this.serial = 1

  this.index = () => {
    return this.agents.sort((agent1, agent2) => agent2.initiative - agent1.initiative)
  }

  this.add = (name, ac, hp, status) => {
    this.agents.push(new Agent(this.serial++, name, ac, hp, status))
  }
}