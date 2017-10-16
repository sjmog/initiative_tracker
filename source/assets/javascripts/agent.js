const Agent = function(id, name, ac, hp, status) {
  this.id     = id
  this.name   = name
  this.initiative = Math.round(Math.random()*20)
  this.ac     = ac
  this.hp     = hp
  this.status = status || []
}