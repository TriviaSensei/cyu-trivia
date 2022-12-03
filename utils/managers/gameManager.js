const { v4: uuidv4 } = require('uuid');
//host disconnection times the game out after 5 minutes
const hostTimeout = 5 * 60 * 1000;

module.exports = class GameManager {
	constructor(idField, userManager) {
		this.games = [];
		this.idField = idField;
		this.userManager = userManager;
	}

	randomCode(len) {
		let code = '';

		for (var i = 0; i < len; i++) {
			code = `${code}${Math.floor(Math.random() * 10)}`;
		}
		return code;
	}

	getAllGames() {
		return this.games;
	}

	startNewGame(host) {
		let existingGame;
		let joinCode;
		do {
			joinCode = this.randomCode(4);
			existingGame = this.getGame(joinCode);
		} while (existingGame);

		if (process.env.LOCAL === 'true') joinCode = '1111';

		const newGame = {
			id: uuidv4(),
			teams: [],
			slides: [],
			joinCode,
			currentSlide: 0,
			key: [],
			chat: [],
			joinRequests: [],
			host,
			hostConnected: true,
		};

		this.games.push(newGame);

		return newGame;
	}

	addChatMessage(id, user, text) {
		let toReturn;
		this.games.find((g) => {
			if (g.id === id) {
				toReturn = {
					mid: uuidv4(),
					name: user.name,
					uid: user.id,
					isHost: user.isHost ? true : false,
					text,
				};
				g.chat.push(toReturn);
				return true;
			}
		});
		return toReturn;
	}

	removeChatMessage(id, mid) {
		let toReturn;
		this.games.chat = this.games.chat.filter((m) => {
			if (m.mid !== mid) return true;
			toReturn = true;
			return false;
		});
		return toReturn;
	}

	getGame(joinCode) {
		return this.games.find((g) => {
			return g.joinCode === joinCode;
		});
	}

	getGameById(id) {
		return this.games.find((g) => {
			return g.id === id;
		});
	}

	getJoinRequests(gameid, teamid) {
		const toReturn = this.getGameById(gameid)?.joinRequests.filter((r) => {
			return r.teamid === teamid;
		});
		return toReturn;
	}

	createTeam(id, captain, name) {
		const captainName = this.userManager.getUserById(captain)?.name;

		const toReturn = {
			id: uuidv4(),
			name,
			players: [
				{
					id: captain,
					name: captainName || '',
					isCaptain: true,
				},
			],
			chat: [],
		};

		let result = {
			success: false,
			message: 'Game not found',
			data: null,
		};

		//for a successful create...
		this.games.some((g) => {
			//we need to find a game with the correct id
			if (g.id === id) {
				result.message = '';
				//the player can't be part of a team already in this game, and the team name can't duplicate someone else's
				if (
					g.teams.every((t) => {
						if (t.name.toLowerCase().trim() === name.toLowerCase().trim()) {
							result.message = 'Team name is taken.';
							return false;
						}
						return t.players.every((p) => {
							if (p.id === captain) {
								result.message = 'Player is already on a team.';
								return false;
							}
							return true;
						});
					})
				) {
					//push the new team into the team table, mark it as a success
					g.teams.push(toReturn);
					result.success = true;
					result.data = toReturn;
				}

				return true;
			}
		});

		return result;
	}

	getTeam(gameid, teamid) {
		let result = {
			success: false,
			message: '',
			data: null,
		};

		const game = this.games.find((g) => {
			return g.id === gameid;
		});
		if (!game) {
			result.message = 'Game not found.';
			return result;
		}

		const team = game.teams.find((t) => {
			return t.id === teamid;
		});

		if (!team) {
			result.message = 'Team not found.';
			return result;
		}

		result.success = true;
		result.data = team;
		return result;
	}

	endGame(id) {
		this.games = this.games.filter((g) => {
			return g[this.idField] !== id;
		});
	}

	setAttribute(id, attribute, value) {
		let toReturn = this.games.find((u) => {
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
};
