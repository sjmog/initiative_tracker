const Tracker = function() {
  this.agents = []

  this.index = () => {
    return this.agents.sort((agent1, agent2) => agent2.initiative - agent1.initiative)
  }

  this.add = (agent) => {
    this.agents.push(agent)
  }
}