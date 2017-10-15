const Agent = function(id, name, ac, hp, status) {
  this.id     = id
  this.name   = name
  this.initiative = Math.round(Math.random()*20)
  this.ac     = ac
  this.hp     = hp
  this.status = status || []

  this.damage = (damage) => {
    this.hp -= damage
  }

  this.addEffect = (status) => {
    this.status.push(status)
  }

  this.removeEffect = (status) => {
    this.status.delete(status)
  }

  this.isKilled = () => {
    return this.hp < 0
  }
}