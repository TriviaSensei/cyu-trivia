const { v4: uuidv4 } = require('uuid');
//host disconnection times the game out after 5 minutes
const hostTimeout = 5 * 60 * 1000;

module.exports = class GameManager {
	constructor(idField) {
		this.games = [];
		this.idField = idField;
	}

	getAllGames() {
		return this.games;
	}

	startNewGame(slides, joinCode, host) {
		const newGame = {
			id: uuidv4(),
			teams: [],
			slides,
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

	addChatMessage(id, text) {
		const toReturn = {
			mid: uuidv4(),
			user: id,
			text,
		};
	}

	getGame(joinCode) {
		return this.games.find((g) => {
			return g.joinCode === joinCode;
		});
	}

	endGame(id) {
		this.games = this.games.filter((g) => {
			return g[this.idField] !== id;
		});
	}
};
