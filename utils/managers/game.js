const { v4: uuidv4 } = require('uuid');

module.exports = class Game {
	constructor(host, joinCode, roundCount) {
		this.id = uuidv4();
		this.players = [];
		this.teams = [];
		this.slides = [];
		this.joinCode = joinCode;
		this.currentSlide = undefined;
		this.currentRound = undefined;
		this.roundCount = roundCount;
		this.key = [];
		this.chat = [];
		this.host = host;
		this.timer = undefined;
	}

	containsPlayer(id) {
		return this.players.some((m) => {
			m.id === id;
		});
	}

	removePlayer(id) {
		this.players = this.players.filter((m) => {
			return m.id !== id;
		});
	}

	addPlayer(player) {
		if (
			!this.players.some((m) => {
				return m.id === player.id;
			})
		)
			this.players.push(player);
	}

	addTeam(team) {
		if (
			this.teams.find((t) => {
				return t.name === team.name;
			})
		) {
			return null;
		}
		this.teams.push(team);
		return team;
	}

	removeTeam(id) {
		let toReturn = false;

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

	getTeam(id) {
		return this.teams.find((t) => {
			return t.id === id;
		});
	}

	advanceSlide() {
		if (this.timer && new Date() < this.timer && process.env.LOCAL !== 'true')
			return false;

		this.currentSlide === undefined
			? (this.currentSlide = 0)
			: this.currentSlide++;

		if (this.slides[this.currentSlide].timer) {
			this.setTimer(this.slides[this.currentSlide].timer);
		}

		if (this.slides[this.currentSlide].newRound) {
			this.currentRound === undefined
				? (this.currentRound = 0)
				: this.currentRound++;
		}

		return true;
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

	setTimer(minutes) {
		this.timer = Date.parse(new Date()) + minutes * 60 * 1000;
	}
};
