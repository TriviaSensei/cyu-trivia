// const { questions, pictures, wildcard } = require('../public/js/utils/questions');
const GameModel = require('../models/gameModel');
const UserModel = require('../models/userModel');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
// const UserManager = require('./managers/userManager');
// const GameManager = require('./managers/gameManager');
const Game = require('./managers/game');
const Team = require('./managers/team');
const User = require('./managers/user');

const disconnectTimeout = 5 * 60 * 1000;
const captainTimeout = 5000;

const { v4: uuidv4 } = require('uuid');
const Filter = require('bad-words');
const { disconnect } = require('process');
const filter = new Filter();

let games = [];
let users = [];

const createSlides = (data, joinCode) => {
	const toReturn = [
		{
			new: true,
			clear: true,
			header: 'Welcome',
			body: `${data.description}\nhttps://www.cyutrivia.com/play\nJoin code: ${joinCode}`,
		},
		{
			new: true,
			clear: true,
			header: 'Rules',
			body: "1. Don't cheat\n2. Don't cheat\n3. Keep answers out of the public chat\n4. Challenges welcome\n5. Host decisions are final.",
		},
	];
	data.rounds.forEach((r, i) => {
		toReturn.push({
			new: true,
			clear: true,
			header: `Round ${i + 1}`,
			body: r.description,
		});
		if (i % 2 === 0) {
			r.questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: true,
					header: `Round ${i + 1}, ${
						j === r.questions.length - 1 ? 'Bonus' : `Question ${j + 1}`
					}\n${j === r.questions.length - 1 ? 'Wager 0-' : ''}${q.value} ${
						q.value === 1 ? 'point' : 'points'
					}`,
					body: q.text,
				});
			});
			toReturn.push({
				new: false,
				clear: false,
				timer: 2,
			});
		} else if (i === 1) {
			const toPush = [];

			r.questions.forEach((q, j) => {
				toPush.push({
					new: true,
					clear: false,
					header: `Round 2, Picture ${j + 1}`,
					picture: q.link,
				});
			});

			toReturn.push(toPush);

			toReturn.push({
				new: false,
				clear: false,
				timer: 1,
			});
		} else if (i === 3) {
			if (r.format === 'questions') {
				const toPush = [];

				r.questions.forEach((q, j) => {
					toPush.push({
						new: true,
						clear: false,
						header: `Round 3, Question ${j + 1}`,
						body: q.text,
					});
				});

				toReturn.push(toPush);
			}

			toReturn.push({
				new: false,
				clear: false,
				timer: 10,
			});
		} else if (i === 5) {
			toReturn.push({
				new: true,
				clear: false,
				header: 'Round 6 - Audio',
				videoLink: r.videoLink,
			});
			toReturn.push({
				new: false,
				clear: false,
				timer: 10,
			});
		}

		if (r.video) {
			toReturn.push({
				new: true,
				clear: true,
				header: 'Stand by',
				videoLink: r.video,
				videoStart: r.videoStart || 0,
			});
		}

		//answers for rounds 1, 3, 5
		if (i % 2 === 1) {
			toReturn.push({
				new: true,
				clear: true,
				header: `Round ${i} answers`,
				mode: 'answers',
				round: i - 1,
			});

			data.rounds[i - 1].questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round ${i}, ${
						j === data.rounds[i - 1].questions.length - 1
							? 'Bonus'
							: `Question ${j + 1}`
					}\n${
						j === data.rounds[i - 1].questions.length - 1 ? 'Wager 0-' : ''
					}${q.value} ${q.value === 1 ? 'point' : 'points'}`,
					body: q.text,
				});
				toReturn.push({
					new: false,
					clear: false,
					footer: q.answer,
				});
			});
		} else if (i === 6) {
			toReturn.push({
				new: true,
				clear: true,
				header: `Round 7 answers`,
				mode: 'answers',
				round: 6,
			});

			data.rounds[6].questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round 7, ${
						j === data.rounds[6].questions.length - 1
							? 'Bonus'
							: `Question ${j + 1}`
					}\n${j === data.rounds[i].questions.length - 1 ? 'Wager 0-' : ''}${
						q.value
					} ${q.value === 1 ? 'point' : 'points'}`,
					body: q.text,
				});
				toReturn.push({
					new: false,
					clear: false,
					footer: q.answer,
				});
			});
		}

		if (i === 1) {
			//answers for round 2
			toReturn.push({
				new: true,
				clear: true,
				header: 'Round 2 answers',
				mode: 'answers',
				round: 1,
			});

			r.questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round 2, Picture ${j + 1}`,
					picture: q.link,
					footer: q.answer,
				});
			});

			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		} else if (i === 3) {
			//answers for rounds 4
			toReturn.push({
				new: true,
				clear: true,
				header: 'Round 4 answers',
				mode: 'answers',
				round: 3,
			});

			if (r.format === 'questions') {
				r.questions.forEach((q, j) => {
					toReturn.push({
						new: true,
						clear: false,
						header: `Round 4, Question ${j + 1}`,
						body: q.text,
					});
					toReturn.push({
						new: false,
						clear: false,
						footer: q.answer,
					});
				});
			} else if (r.format === 'list') {
				let str = '';
				r.answerList.forEach((a, j) => {
					let isNew = false;
					if (j % 5 === 0) {
						str = '';
						isNew = true;
					}
					str = `${str}${a}\n`;
					toReturn.push({
						new: isNew,
						clear: false,
						header: `Round 4: List Answers`,
						body: str,
					});
				});
			} else if (r.format === 'matching') {
				r.matchingPairs.forEach((q, j) => {
					toReturn.push({
						new: true,
						clear: false,
						header: `Round 4: Matching Answers`,
						body: q.prompt,
					});
					toReturn.push({
						new: false,
						clear: false,
						footer: q.answer,
					});
				});
			}

			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		} else if (i === 5) {
			//answers for round 6
			toReturn.push({
				new: true,
				clear: true,
				header: 'Round 6 Answers',
				mode: 'answers',
				round: 5,
			});

			let str = '';
			r.questions.forEach((a, j) => {
				let isNew = false;
				if (j % 5 === 0) {
					str = '';
					isNew = true;
				}
				str = `${str}${j + 1}. ${a}\n`;
				toReturn.push({
					new: isNew,
					clear: false,
					header: `Round 6: Audio Answers`,
					body: str,
				});
			});

			if (r.theme) {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round 6: Theme`,
					body: r.theme,
				});
			}

			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		} else if (i === 6) {
			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		}
	});

	return toReturn;
};
const randomCode = (len) => {
	let code = '';

	for (var i = 0; i < len; i++) {
		code = `${code}${Math.floor(Math.random() * 10)}`;
	}
	return code;
};
const getGame = (joinCode) => {
	return games.find((g) => {
		return g.joinCode === joinCode;
	});
};
const getGameForUser = (id) => {
	return games.find((g) => {
		return (
			g.host.id === id ||
			g.players.some((p) => {
				return p.id === id;
			})
		);
	});
};

const getUser = (id) => {
	return users.find((u) => {
		return u.id === id;
	});
};

const replaceBrackets = (text) => {
	const re1 = /</g;
	const re2 = />/g;
	return text.replace(re1, '&lt;').replace(re2, '&gt;');
};
// const startNewGame = (host) => {
// 	let existingGame;
// 	let joinCode;
// 	do {
// 		joinCode = this.randomCode(4);
// 		existingGame = this.getGame(joinCode);
// 	} while (existingGame);
// 	if (process.env.LOCAL === 'true') joinCode = '1111';

// };

const socket = (http, server) => {
	const io = require('socket.io')(http, {
		pingInterval: 100,
		pingTimeout: 500,
	});

	io.listen(server);

	// const userManager = new UserManager('id');
	// const gameManager = new GameManager('id', userManager);

	io.on('connection', async (socket) => {
		let myUser;
		let myTeam;
		let myGame;

		const emitError = (msg) => {
			io.to(socket.id).emit('error', { message: msg });
		};

		const systemMsg = (text) => {
			const newMsg = myGame.addChatMessage(
				{ name: 'system', id: 'system' },
				text
			);
			if (myGame) {
				socket.to(myGame.id).emit('game-chat', {
					from: 'System',
					isSystem: true,
					isHost: false,
					message: newMsg.text,
					id: newMsg.mid,
				});
			}
		};

		const getCookie = (name) => {
			let cookies;
			if (socket.handshake.headers.cookie) {
				cookies = socket.handshake.headers.cookie.split(';');
				for (var j = 0; j < cookies.length; j++) {
					const tokens = cookies[j].trim().split('=');
					if (tokens[0] === name) {
						return tokens.length > 1 ? tokens[1] : null;
					}
				}
			}
			return null;
		};

		const handleDisconnect = () => {
			if (!myUser) return;
			myUser.connected = false;
			myUser.lastDisconnect = new Date();

			//notify myGame that user has disconnected
			if (myGame) {
				//see what happens if I pass a class-based object to the client - is it just an object?
				io.to(myGame.id).emit('user-disconnected', myUser);
			}

			//set timer to remove player from list of players
			setTimeout(() => {
				users = users.filter((u) => {
					if (
						u.connected ||
						!u.lastDisconnect ||
						u.lastDisconnect + disconnectTimeout > new Date()
					) {
						return true;
					} else {
						if (myGame) {
							io.to(myGame.id).emit('user-deleted', { id: u.id });
						}
						return false;
					}
				});
			}, disconnectTimeout);

			//TODO:
			//	handle someone reconnecting after everyone disconnects
			if (myTeam && myTeam.captain.id === myUser.id) {
				setTimeout(() => {
					//don't replace me if myuser has reconnected in the time limit,
					//or it isn't time for replacement yet
					if (
						myUser.connected ||
						myUser.lastDisconnect + captainTimeout > new Date()
					)
						return;
					const newCaptain = myTeam.changeCaptain(false);
					if (newCaptain) {
						io.to(newCaptain.id).emit('set-captain', null);
					}
				}, captainTimeout);
			}
		};

		const uid = getCookie('id');
		const token = getCookie('jwt');
		let loggedInUser;
		let decoded;
		if (token) {
			decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
			if (decoded) {
				loggedInUser = await UserModel.findById(decoded.id);
			}
		}
		console.log(`A user has connected from ${socket.handshake.address}`);
		if (loggedInUser) {
			console.log(`\tName: ${loggedInUser.displayName}`);
		}

		if (uid) {
			console.log(`Looking up user ${uid}`);
			myUser = getUser(uid);
			if (myUser) {
				myUser.connected = true;
				myUser.lastDisconnect = undefined;
			}
			socket.join(uid);
		}

		if (!myUser) {
			console.log(`...not found...creating new user.`);
			myUser = new User(loggedInUser ? loggedInUser.displayName : '');
			users.push(myUser);
			socket.join(myUser.id);
		}

		console.log(`\tID: ${myUser.id}`);

		io.to(socket.id).emit('set-user-cookie', { id: myUser.id });

		//rejoin the team and game chat if they were part of one already
		myGame = getGameForUser(myUser.id);

		if (myGame) {
			socket.join(myGame.id);

			console.log(`${myUser.name} rejoining game ${myGame.id}`);
			systemMsg(`${myUser.name} has reconnected`);

			if (myUser.id !== myGame.host.id)
				io.to(socket.id).emit('game-joined', {
					...myGame,
					slides: myGame.slides.slice(0, myGame.currentSlide + 1),
				});
			else
				io.to(socket.id).emit('game-started', {
					newGame: myGame,
				});

			myTeam = myGame.getTeamForPlayer(myUser.id);
			if (myTeam) {
				socket.join(myTeam.id);
				console.log(`${myUser.name} rejoining team ${myTeam.id}`);

				//is anyone connected other than me? if not, I am the captain now.
				if (
					!myTeam.members.find((m) => {
						return m.connected && m.id !== myUser.id;
					})
				) {
					myTeam.changeCaptain(true, myUser.id);
				}
			}
		}

		// io.to(user.gameid).emit('')
		// socket.on('request-questions', (data) => {
		// 	console.log('questions requested');
		// 	io.to(socket.id).emit('questions', { questions, pictures, wildcard });
		// });

		socket.on('start-game', async (data) => {
			if (!jwt || !myUser) {
				return emitError('You are not logged in');
			}

			const game = await GameModel.findById(data._id);
			if (!game || game.deleteAfter) {
				emitError('Game not found.');
			}
			if (game.assignedHosts.includes(decoded.id)) {
				if (new Date() <= game.date && process.env.LOCAL !== 'true') {
					return emitError('This game may not be started yet.');
				}

				myGame = new Game(myUser, randomCode(4));
				console.log(`Starting game with join code ${myGame.joinCode}`);
				while (getGame(myGame.joinCode)) {
					myGame.joinCode = randomCode(4);
					console.log(`...which is taken. New code is ${myGame.joinCode}`);
				}
				if (process.env.LOCAL === 'true') {
					myGame.joinCode = '1111';
				}
				games.push(myGame);
				const slides = createSlides(game, myGame.joinCode);
				myGame.slides = slides;
				myGame.currentSlide = 0;

				socket.join(myGame.id);

				console.log(`${myUser.name} has started game ${myGame.id}`);

				io.to(socket.id).emit('game-started', { newGame: myGame });
				io.emit('live-now', {
					live: true,
				});
			} else {
				return emitError('You are not a host of this game.');
			}
		});

		socket.on('join-game', (data) => {
			if (filter.isProfane(data.name)) {
				return emitError('Watch your language');
			}

			if (myGame) return;

			myGame = getGame(data.joinCode);

			if (!myGame) {
				return emitError('Game not found.');
			}

			myGame.players.push(myUser);

			myUser.name = data.name;

			console.log(`${myUser.name} (${myUser.id}) joining game ${myGame.id}`);
			socket.join(myGame.id);

			systemMsg(`${data.name} has joined the game.`);

			io.to(socket.id).emit('game-joined', {
				...myGame,
				slides: myGame.slides.slice(0, myGame.currentSlide + 1),
			});
		});

		socket.on('game-chat', (data, cb) => {
			if (filter.isProfane(data.message)) {
				cb({
					status: 'FAIL',
				});
				return emitError('Watch your language');
			}
			const message = replaceBrackets(data.message);

			if (!myGame) {
				return cb({ status: 'FAIL', message: 'Game not found.' });
			}
			if (!myUser) {
				return cb({ status: 'FAIL', message: 'User not found.' });
			}
			const newMsg = myGame.addChatMessage(myUser, message);

			cb({
				status: 'OK',
				message,
				id: newMsg.mid,
			});

			socket.to(myGame.id).emit('game-chat', {
				from: myUser.name,
				isHost: newMsg.isHost,
				message,
				id: newMsg.mid,
			});
		});

		socket.on('set-team-name', (data, cb) => {
			if (filter.isProfane(data.name)) {
				cb({
					status: 'FAIL',
					message: 'Watch your language.',
				});
			}

			const name = replaceBrackets(data.name);

			if (!myUser)
				return cb({
					status: 'FAIL',
					message: 'User not found',
				});

			//ensure the user is part of a game
			if (!myGame) {
				return cb({
					status: 'FAIL',
					message: 'You are not part of a game.',
				});
			}

			//creating a team
			if (!myTeam) {
				myTeam = new Team(name, myUser);
				myGame.addTeam(myTeam);
				cb({
					status: 'OK',
					id: myTeam.id,
					name: myTeam.name,
				});
				io.to(myGame.id).emit('new-team', {
					name: data.name,
					id: myTeam.id,
				});
			} else {
				//editing team name
				//see if this also edits it in the game as well
				myTeam.name = name;
				cb({
					status: 'OK',
					id: myTeam.id,
					name: myTeam.name,
				});
			}
		});

		socket.on('disconnect', (reason) => {
			console.log(
				`${
					myUser ? (myUser.name ? myUser.name : myUser.id) : 'A user'
				} has disconnected`
			);

			handleDisconnect();

			if (myGame) {
				systemMsg(`${myUser.name} has disconnected.`);
			}
		});
	});
};

module.exports = socket;
