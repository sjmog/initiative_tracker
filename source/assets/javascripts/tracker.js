const Tracker = function() {
  this.agents = []
  this.serial = 1

  this.index = () => {
    return this.agents.sort((agent1, agent2) => agent2.initiative - agent1.initiative)
  }

  this.upsert = (agent) => {
    if (!this.agents.includes(agent)) {
      this._add(agent)
    }
  }

  this._add = (agent) => {
    agent.id = this.serial++
    this.agents.push(agent)
  }
}