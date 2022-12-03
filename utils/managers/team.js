const { v4: uuidv4 } = require('uuid');

module.exports = class Team {
	constructor(name, captain) {
		this.name = name;
		this.id = uuidv4();
		this.members = [captain];
		this.chat = [];
		this.submissions = [];
		this.joinRequests = [];
		this.captain = captain;
	}

	containsPlayer(id) {
		return this.members.some((m) => {
			m.id === id;
		});
	}

	removePlayer(id) {
		this.members = this.members.filter((m) => {
			return m.id !== id;
		});
	}

	addPlayer(player) {
		if (
			!this.members.some((m) => {
				return m.id === player.id;
			})
		)
			this.members.push(player);
	}

	changeCaptain(force, ...id) {
		//don't change captain if the captain still connected and we aren't being forced to
		if (this.captain.connected && !force) return undefined;

		//if an id is specified, make that person the captain if they exist on this team.
		//otherwise, don't do anything and return false (because captain was not changed)
		if (id.length > 0) {
			return this.members.find((m) => {
				if (m.id === id[0] && m.connected) {
					this.captain = m;
					return true;
				}
			});
		}

		//no ID was specified, take the first person on the roster who isn't already captain
		//and is currently connected. If none, then the captain doesn't change.
		return this.members.find((m) => {
			if (m.connected && this.captain.id !== m.id) {
				this.captain = m;
				return true;
			}
		});
	}
};
