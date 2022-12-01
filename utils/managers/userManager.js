const { v4: uuidv4 } = require('uuid');

//user gets removed if they disconnect for 3 minutes
// const userTimeout = 3 * 60 * 1000;
const userTimeout = 3000;
module.exports = class UserManager {
	constructor(idField) {
		this.users = [];
		this.idField = idField;
	}

	getAllUsers() {
		return this.users;
	}

	//add or replace existing user, using id as an identifier (replace if id already exists, push if not)
	//returns the created or updated user object
	addUser(user, id) {
		const existingUser = this.users.find((u) => {
			if (u[this.idField] === id) {
				const props = Object.getOwnPropertyNames(u);
				props.forEach((p) => {
					if (u[p] && user[p]) {
						u[p] = user[p];
					}
				});
				u.connected = true;
				u.lastDisconnect = undefined;
				return true;
			}
		});

		if (!existingUser) {
			const toReturn = {
				...user,
				id: uuidv4(),
				teamid: '',
				gameid: '',
				connected: true,
				lastDisconnect: undefined,
			};

			this.users.push(toReturn);

			return toReturn;
		}

		return existingUser;
	}

	// getUser(filter) {
	// 	const props = Object.getOwnPropertyNames(filter);
	// 	return this.users.find((u) => {
	// 		return props.every((p) => {
	// 			return u[p] === filter[p];
	// 		});
	// 	});
	// }

	getUser(id) {
		return this.users.find((u) => {
			return u.socketid === id;
		});
	}

	getUserById(id) {
		return this.users.find((u) => {
			return u.id === id;
		});
	}

	setUserName(id, name) {
		let toReturn;
		this.users.some((u) => {
			if (u.id === id) {
				u.name = name;
				toReturn = { ...u };
				return true;
			}
		});
		return toReturn;
	}

	setUserTeam(id, teamid) {
		let toReturn;
		this.users.some((u) => {
			if (u.id === id) {
				u.teamid = teamid;
				toReturn = { ...u };
				return true;
			}
		});
		return toReturn;
	}

	setUserGame(id, gameid) {
		let toReturn;
		this.users.some((u) => {
			if (u.id === id) {
				u.gameid = gameid;
				toReturn = { ...u };
				return true;
			}
		});
		return toReturn;
	}

	setAttribute(id, attribute, value) {
		let toReturn = this.users.find((u) => {
			if (u.id === id) {
				if (Array.isArray(attribute)) {
					if (Array.isArray(value) && attribute.length === value.length) {
						attribute.forEach((a, i) => {
							u[a] = value[i];
						});
					} else return false;
				} else if ((typeof attribute).toUpperCase() === 'STRING') {
					u[attribute] = value;
				} else if ((typeof attribute).toUpperCase() === 'OBJECT') {
					const props = Object.getOwnPropertyNames(attribute);
					props.forEach((p) => {
						u[p] = attribute[p];
					});
				}
				return true;
			}
		});
		return toReturn;
	}

	removeUser(id) {
		this.users = this.users.filter((u) => {
			if (u[this.idField] === id) {
				return !u.connected && u.lastDisconnect + userTimeout < new Date();
			}
			return true;
		});
	}

	handleDisconnect(id) {
		this.users.some((u) => {
			if (u.socketid === id) {
				u.lastDisconnect = new Date();
				u.connected = false;
				const that = this;
				setTimeout(() => {
					that.removeUser(id);
				}, userTimeout);
				return true;
			}
		});
	}
};
