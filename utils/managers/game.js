const { v4: uuidv4 } = require('uuid');

module.exports = class Game {
	constructor(host, joinCode) {
		this.id = uuidv4();
		this.players = [];
		this.teams = [];
		this.slides = [];
		this.joinCode = joinCode;
		this.currentSlide = undefined;
		this.key = [];
		this.chat = [];
		this.joinRequests = [];
		this.host = host;
	}

	addTeam(team) {
		this.teams.push(team);
	}

	removeTeam(id) {
		toReturn = false;

		this.teams = this.teams.filter((t) => {
			if (t.id === id) {
				if (
					!t.members.some((m) => {
						return m.connected;
					})
				) {
					toReturn = true;
					return false;
				}
				return true;
			}
			return true;
		});

		return toReturn;
	}

	advanceSlide() {
		this.currentSlide === undefined
			? (this.currentSlide = 0)
			: this.currentSlide++;
	}

	getTeamForPlayer(id) {
		return this.teams.find((t) => {
			return t.containsPlayer(id);
		});
	}

	addChatMessage(user, text) {
		let toReturn = {
			mid: uuidv4(),
			user,
			isHost: user.id === this.host.id,
			text,
		};
		this.chat.push(toReturn);
		return toReturn;
	}
};
