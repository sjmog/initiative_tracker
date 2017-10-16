const PropertyComponent = function(parent, agent, property) {
  this.id = App.register(this)

  this.render = () => {
    return `
    <td 
      onBlur="App.find(${this.id}).change(this)"
      onFocus="$(this).text('')" 
      data-attr="${property}" 
      data-id="${agent.id}" 
      contenteditable>${agent[property]}
    </td>
    `
  }

  this.change = (el) => {
    parent.change(property, $(el).text())
  }
}