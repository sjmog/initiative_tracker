const Dice = function() {
  this.number = (diceString) => {
    return diceString.match(/^(\d+)/)[0]
  }

  this.type = (diceString) => {
    return diceString.match(/^\d+d(\d+)/)[1]
  }

  return {
    number: this.number,
    type: this.type
  }
}()