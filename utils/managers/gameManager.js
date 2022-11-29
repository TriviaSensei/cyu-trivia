const { v4: uuidv4 } = require('uuid');
//host disconnection times the game out after 5 minutes
const hostTimeout = 5 * 60 * 1000;

module.exports = class GameManager {
	constructor(idField) {
		this.games = [];
		this.idField = idField;
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

	removeChatMessage(id, mid) {}

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
