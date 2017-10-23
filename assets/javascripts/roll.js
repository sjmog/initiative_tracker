const Roll = function(diceString) {
  const numberOfDice = diceString.match(/^(\d+)/)[0]
  const typeOfDice = diceString.match(/^\d+d(\d+)/)[1]

  let accumulator = 0
  for(var i = 0; i < numberOfDice; i++) {
    accumulator += Math.floor(Math.random() * typeOfDice) + 1
  }
  return accumulator
} 
;
