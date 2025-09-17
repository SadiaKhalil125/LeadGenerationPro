import Attribute from "./Attribute";

class EntityRequest {
  constructor(name, attributes = []) {
    this.name = name;               // Table name
    this.attributes = attributes;   // List of Attribute objects
  }

  // Helper method to add an attribute
  addAttribute(attribute) {
    if (attribute instanceof Attribute) {
      this.attributes.push(attribute);
    } else {
      throw new Error("Expected an Attribute instance");
    }
  }
}

export default EntityRequest;