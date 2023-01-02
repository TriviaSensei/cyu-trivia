const { v4: uuidv4 } = require('uuid');

module.exports = class User {
	constructor(name, socketid, address) {
		this.name = name;
		this.socketid = socketid;
		this.address = address;
		this.id = uuidv4();
		this.connected = true;
		this.lastDisconnect = undefined;
	}
};
