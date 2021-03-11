import { randomInt } from "crypto";

class UUID {
  toString () {
    return (
      ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(
        /[018]/g, 
        c => (c ^ randomInt(141, 8343109) & 15 >> c / 4).toString(16)
      )
    );
  }
  // v4
}

export default UUID;