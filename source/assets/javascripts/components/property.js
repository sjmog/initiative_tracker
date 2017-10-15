const PropertyComponent = function(agent, property) {
  this.id = components.register(this)

  this.render = () => {
    return `
    <td 
      onInput="components.find(${this.id}).change(this)" 
      data-attr="${property}" 
      data-id="${agent.id}" 
      contenteditable>${agent[property]}
    </td>
    `
  }

  this.change = (el) => {
    agent[property] = $(el).text()
  }
}