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

const { reqTimeout, disconnectTimeout, captainTimeout } = require('./settings');

const Filter = require('bad-words');
const filter = new Filter();

let games = [];
let users = [];

const createSlides = (data, joinCode) => {
	const toReturn = [
		{
			new: true,
			clear: true,
			header: 'Welcome',
			body: `${data.description}\n\nhttps://www.cyutrivia.com/play\n\nJoin code: ${joinCode}`,
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
			newRound: true,
			roundNumber: i + 1,
			format: i !== 3 ? 'std' : r.format === 'questions' ? 'std' : r.format,
			questionCount:
				i !== 3 || r.format === 'questions'
					? r.questions.length + (r.theme ? 1 : 0)
					: r.format === 'list'
					? r.answerCount
					: r.matchingPairs.length,
			matchingPrompts:
				r.format === 'matching'
					? r.matchingPairs.map((m) => {
							return m.prompt;
					  })
					: [],
			matchingBank:
				r.format === 'matching'
					? r.matchingPairs
							.map((m) => {
								return m.answer;
							})
							.concat(r.extraAnswers)
					: [],
			endBonus: i % 2 === 0,
			endTheme: r.theme,
			maxWager: i % 2 === 0 ? r.questions[r.questions.length - 1].value : 0,
		});
		if (i % 2 === 0) {
			r.questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
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
				autoplay: false,
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
				autoplay: true,
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
				});
				toReturn.push({
					new: false,
					clear: false,
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
const getGameById = (id) => {
	return games.find((g) => {
		return g.id === id;
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

const socket = (http, server) => {
	const io = require('socket.io')(http, {
		pingInterval: 100,
		pingTimeout: 500,
	});

	io.listen(server);

	io.on('connection', async (socket) => {
		let myUser;
		let myTeam;
		let myGame;

		const verifyHost = () => {
			if (!myGame)
				return {
					status: 'fail',
					message: 'You are not part of a game.',
				};
			if (myGame.host.id !== myUser.id) {
				return {
					status: 'fail',
					message: 'You are not hosting a game.',
				};
			}
			return {
				status: 'OK',
			};
		};

		const verifyCaptain = () => {
			if (!myGame)
				return {
					status: 'fail',
					message: 'You are not part of a game.',
				};
			if (!myTeam) {
				return {
					status: 'fail',
					message: 'You are not part of a team.',
				};
			}
			if (myTeam.captain.id !== myUser.id) {
				return {
					status: 'fail',
					message: 'You are not the captain of this team.',
				};
			}
			return {
				status: 'OK',
			};
		};

		const verifyGame = () => {
			if (!myGame) {
				return {
					status: 'fail',
					message: 'You are not part of a team.',
				};
			}
			return {
				status: 'OK',
			};
		};

		const verifyTeam = () => {
			if (!myGame)
				return {
					status: 'fail',
					message: 'You are not part of a game.',
				};
			if (!myTeam) {
				return {
					status: 'fail',
					message: 'You are not part of a team.',
				};
			}
			return {
				status: 'OK',
			};
		};

		const sanitize = (data) => {
			if (Array.isArray(data)) {
				return data.map((d) => {
					return sanitize(d);
				});
			} else if ((typeof data).toString().toUpperCase() === 'OBJECT') {
				if (!data) return null;
				const props = Object.getOwnPropertyNames(data);
				let toReturn = {
					...data,
				};
				props.forEach((p) => {
					if (p === 'socket') toReturn[p] = undefined;
					else if (p === 'game') toReturn[p] = undefined;
					else toReturn[p] = sanitize(data[p]);
				});
				return toReturn;
			} else {
				return data;
			}
		};

		const emitError = (msg) => {
			io.to(socket.id).emit('error', { message: msg });
		};

		const systemMsg = (text, ...team) => {
			const newMsg = myGame.addChatMessage(
				{ name: 'system', id: 'system' },
				text
			);
			if (myGame) {
				if (!team || team.length === 0) {
					socket.to(myGame.id).emit('game-chat', {
						from: 'System',
						isSystem: true,
						isHost: false,
						message: newMsg.text,
						id: newMsg.mid,
					});
				} else {
					socket.to(myTeam.roomid).emit('team-chat', {
						from: 'System',
						isSystem: true,
						isHost: false,
						message: newMsg.text,
						id: newMsg.mid,
					});
				}
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

			//notify myGame and myTeam that user has disconnected
			if (myGame) {
				systemMsg(`${myUser.name} has disconnected.`);
				io.to(myGame.id).emit('user-disconnected', { id: myUser.id });
			}
			if (myTeam) {
				systemMsg(`${myUser.name} has disconnected.`, true);
			}

			//set timer to remove player from list of players
			setTimeout(() => {
				users = users.filter((u) => {
					//do nothing if I'm connected, I haven't disconnected,
					//my last disconnnect wasn't long enough ago, or if this isn't me.
					if (
						u.connected ||
						!u.lastDisconnect ||
						u.lastDisconnect + disconnectTimeout > new Date() ||
						u.id !== myUser.id
					) {
						return true;
					} else {
						//if I'm in a game...
						if (myGame) {
							//tell my game that I should be removed
							io.to(myGame.id).emit('user-deleted', { id: u.id });
							//remove my player from the list in my game
							myGame.removePlayer(myUser.id);
							//remove my player from the list in my team, if I have a team
							if (myTeam) {
								myTeam.removePlayer(myUser.id);
							}
						}
						return false;
					}
				});
			}, disconnectTimeout);

			if (myTeam && myTeam.captain.id === myUser.id) {
				setTimeout(() => {
					//don't replace me if myuser has reconnected in the time limit,
					//or it isn't time for replacement yet
					if (
						myUser.connected ||
						myUser.lastDisconnect + captainTimeout > new Date()
					)
						return;
					//change captains (but don't force it)
					const newCaptain = myTeam.changeCaptain(false);
					if (newCaptain) {
						io.to(newCaptain.id).emit('new-captain', null);
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
				socket.join(uid);
			}
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
			console.log(`${myUser.name} rejoining game ${myGame.id}`);
			socket.to(myGame.id).emit('user-reconnected', { id: myUser.id });
			socket.join(myGame.id);
			systemMsg(`${myUser.name} has reconnected`);

			myTeam = myGame.getTeamForPlayer(myUser.id);
			if (myTeam) {
				socket.join(myTeam.roomid);
				console.log(`${myUser.name} rejoining team ${myTeam.id}`);

				systemMsg(`${myUser.name} has reconnected.`, true);
				//is anyone connected other than me? if not, I am the captain now.
				if (
					!myTeam.members.find((m) => {
						return m.connected && m.id !== myUser.id;
					})
				) {
					myTeam.changeCaptain(true, myUser.id);
				}
			}
			if (myUser.id !== myGame.host.id) {
				io.to(socket.id).emit('game-joined', {
					...sanitize(myGame),
					isCaptain: myTeam && myTeam.captain.id === myUser.id,
					timeLeft: myGame.timer
						? myGame.timer - Date.parse(new Date())
						: undefined,
					slides: myGame.slides.slice(0, myGame.currentSlide + 1),
					// slides: myGame.slides,
				});
			} else {
				io.to(socket.id).emit('game-started', {
					newGame: sanitize(myGame),
				});
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

				myGame = new Game(myUser, randomCode(4), { ...game._doc });
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

				io.to(myUser.id).emit('game-started', {
					newGame: sanitize(myGame),
				});

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
			io.to(myGame.id).emit('user-joined', {
				id: myUser.id,
				name: myUser.name,
			});
			socket.join(myGame.id);

			systemMsg(`${data.name} has joined the game.`);

			const toSend = sanitize(myGame);
			io.to(socket.id).emit('game-joined', {
				...toSend,
				slides: myGame.slides.slice(0, myGame.currentSlide + 1),
			});
		});

		socket.on('game-chat', (data, cb) => {
			if (filter.isProfane(data.message)) {
				cb({
					status: 'fail',
				});
				return emitError('Watch your language');
			}
			const message = replaceBrackets(data.message);

			const res = verifyGame();
			if (res.status !== 'OK') return cb(res);

			if (!myUser) {
				return cb({ status: 'fail', message: 'User not found.' });
			}
			const newMsg = myGame.addChatMessage(myUser, message);

			cb({
				status: 'OK',
				message,
				id: newMsg.mid,
			});

			socket.to(myGame.id).emit('game-chat', {
				to: 'game',
				from: myUser.name,
				isHost: newMsg.isHost,
				message,
				id: newMsg.mid,
			});
		});

		socket.on('team-chat', (data, cb) => {
			if (filter.isProfane(data.message)) {
				cb({
					status: 'fail',
				});
				return emitError('Watch your language');
			}
			const message = replaceBrackets(data.message);

			const res = verifyTeam();
			if (res.status !== 'OK') return cb(res);

			if (!myUser) {
				return cb({ status: 'fail', message: 'User not found.' });
			}

			const newMsg = myTeam.addChatMessage(myUser, message);

			socket.to(myTeam.roomid).emit('team-chat', {
				to: 'team',
				from: myUser.name,
				isHost: newMsg.isHost,
				message,
				id: newMsg.mid,
			});

			cb({
				status: 'OK',
				message,
				id: newMsg.mid,
			});
		});

		socket.on('set-team-name', (data, cb) => {
			if (filter.isProfane(data.name)) {
				cb({
					status: 'fail',
					message: 'Watch your language.',
				});
			}

			const name = replaceBrackets(data.name);

			if (!myUser)
				return cb({
					status: 'fail',
					message: 'User not found',
				});

			//ensure the user is part of a game
			let res = verifyGame();
			if (res.status !== 'OK') return cb(res);

			//creating a team
			if (!myTeam) {
				myTeam = myGame.addTeam(new Team(name, myUser, myGame));
				if (!myTeam) {
					return cb({
						status: 'fail',
						message: 'A team with that name already exists.',
					});
				}
				socket.join(myTeam.roomid);
				cb({
					status: 'OK',
					id: myTeam.id,
					roomid: myTeam.roomid,
					name: myTeam.name,
					players: sanitize(myTeam.members),
				});

				let roundIntro;

				if (myGame.currentSlide >= 0) {
					for (var i = myGame.currentSlide; i >= 0; i--) {
						if (myGame.slides[i].newRound) {
							roundIntro = {
								...myGame.slides[i],
								new: false,
								clear: false,
								header: null,
								body: null,
								footer: null,
							};
							break;
						}
					}
					if (roundIntro) {
						io.to(socket.id).emit('next-slide', {
							isCaptain: true,
							continueTimer: true,
							slide: roundIntro,
						});
					}
				}

				io.to(myGame.id).emit('new-team', {
					name: data.name,
					id: myTeam.id,
					players: sanitize(myTeam.members),
				});
			} else {
				//editing team name
				res = verifyCaptain();
				if (res.status !== 'OK') return cb(res);

				myTeam.name = name;
				cb({
					status: 'OK',
					id: myTeam.id,
					name: myTeam.name,
				});
				io.to(myGame.id).emit('edit-team-name', {
					name: data.name,
					id: myTeam.id,
				});
				io.to(myTeam.roomid).emit('set-team-name', {
					name: myTeam.name,
				});
			}
		});

		socket.on('request-join', (data, cb) => {
			if (!myUser)
				return cb({
					status: 'fail',
					message: 'User not found.',
				});

			const res = verifyGame();
			if (res.status !== 'OK') return cb(res);

			if (myTeam)
				return cb({
					status: 'fail',
					message: 'You are already on a team.',
				});

			let timeLeft;
			if (
				myGame.teams.some((t) => {
					return t.joinRequests.some((r) => {
						if (r.userid === myUser.id) {
							timeLeft = reqTimeout - (new Date() - Date.parse(r.created));
							return true;
						}
					});
				})
			) {
				return cb({
					status: 'fail',
					message: 'You have an active join request.',
					timeLeft,
				});
			}

			const reqTeam = myGame.getTeam(data.teamid);
			if (!reqTeam)
				return cb({
					status: 'fail',
					message: 'Team not found.',
				});

			const dr = reqTeam.deniedRequests.find((d) => {
				return d.player.id === myUser.id;
			});
			if (dr && dr.count >= 3) {
				return cb({
					status: 'fail',
					message: 'You may no longer request to join this team.',
				});
			}

			reqTeam.addJoinRequest(myUser);

			if (reqTeam.joinRequests.length === 1) {
				console.log(`Sending join request to ${reqTeam.captain.id}`);
				reqTeam.setJoinTimer();
				io.to(reqTeam.captain.id).emit('join-request', sanitize(myUser));
			}

			return cb({
				status: 'OK',
			});
		});

		socket.on('join-team-by-id', (data, cb) => {
			myTeam = myGame.teams.find((t) => {
				return t.roomid === data.id;
			});
			if (!myTeam) {
				cb({
					status: 'fail',
					message: 'Team not found',
				});
			}
			socket.join(myTeam.roomid);
			cb({ status: 'OK' });
		});

		socket.on('cancel-join', (data, cb) => {
			if (
				!myGame.teams.some((t) => {
					if (t.cancelJoinRequest(data.id)) {
						io.to(t.captain.id).emit('cancel-join-request', myUser);
						return true;
					}
					return false;
				})
			) {
				return cb({
					status: 'fail',
					message: 'Request not found',
				});
			}
			cb({
				status: 'OK',
			});
		});

		socket.on('accept-teammate', (data) => {
			const res = verifyCaptain();
			if (res.status !== 'OK') return emitError(res.message);

			if (
				myTeam.members.find((m) => {
					return m.id === data.id;
				})
			) {
				return emitError('That player is already on your team.');
			}

			const newPlayer = myTeam.cancelJoinRequest(data.id);
			myTeam.addPlayer(newPlayer);
			console.log(
				`${newPlayer.name} accepted onto team ${myTeam.name} (Room ID: ${myTeam.roomid})`
			);

			const newMsg = myTeam.addChatMessage(
				{ name: 'system', id: 'system' },
				`${newPlayer.name} has joined the team.`
			);

			io.to(myTeam.roomid).emit('new-teammate', {
				name: newPlayer.name,
				id: data.id,
				mid: newMsg.mid,
				message: newMsg.text,
			});

			io.to(data.id).emit('request-accepted', {
				name: myTeam.name,
				roomid: myTeam.roomid,
				members: sanitize(myTeam.members),
				captain: sanitize(myTeam.captain),
			});

			if (myTeam.joinRequests.length > 0) {
				setTimeout(() => {
					io.to(myUser.id).emit('join-request', myTeam.joinRequests[0].player);
					myTeam.setJoinTimer();
				}, 200);
			}
		});

		socket.on('decline-teammate', (data) => {
			const res = verifyCaptain();
			if (res.status !== 'OK') return emitError(res.message);

			const newPlayer = myTeam.cancelJoinRequest(data.id);
			const dr = myTeam.deniedRequests.find((d) => {
				return d.player.id === data.id;
			});
			if (dr) {
				dr.count++;
			} else {
				myTeam.deniedRequests.push({
					player: newPlayer,
					count: 1,
				});
			}
			io.to(data.id).emit('request-denied', { name: myTeam.name });

			if (myTeam.joinRequests.length > 0) {
				setTimeout(() => {
					io.to(myUser.id).emit('join-request', myTeam.joinRequests[0].player);
					myTeam.setJoinTimer();
				}, 200);
			}
		});

		socket.on('leave-team', (data) => {
			if (!myTeam) {
				emitError('You are not on a team.');
			}
			const newMsg = myTeam.addChatMessage(
				{ name: 'system', id: 'system' },
				`${myUser.name} has left the team.`
			);

			socket.leave(myTeam.roomid);
			io.to(myTeam.roomid).emit('teammate-left', {
				id: myUser.id,
				name: myUser.name,
				mid: newMsg.mid,
				message: newMsg.text,
			});
			const oldCaptainId = myTeam.captain.id;
			myTeam.removePlayer(myUser.id);
			const newCaptainId = myTeam.captain.id;
			if (oldCaptainId !== newCaptainId) {
				io.to(newCaptainId).emit('new-captain', null);
			}
			if (myTeam.members.length === 0) {
				myGame.removeTeam(myTeam.id);
				io.to(myGame.id).emit('remove-team', { id: myTeam.id });
			}
			myTeam = undefined;
		});

		socket.on('next-slide', (data, cb) => {
			const res = verifyHost();
			if (res.status !== 'OK') return cb(res);

			if (myGame.advanceSlide()) {
				cb({
					status: 'OK',
					data: myGame.slides[myGame.currentSlide],
				});

				myGame.players.forEach((p) => {
					socket.to(p.id).emit('next-slide', {
						isCaptain: myGame.teams.some((t) => {
							return t.captain.id === p.id;
						}),
						slide: myGame.slides[myGame.currentSlide],
					});
				});
			} else {
				return cb({
					status: 'fail',
					message: 'You must wait until the timer ends to advance the deck.',
				});
			}
		});

		socket.on('update-answer', (data) => {
			const res = verifyCaptain();
			if (res.status !== 'OK') return emitError(res.message);
			if (data.round !== myGame.currentRound)
				return emitError('Incorrect round');

			myTeam.updateResponse(myGame.currentRound, data.question, data.answer);

			socket.to(myTeam.roomid).emit('update-answer', data);
		});

		socket.on('update-wager', (data) => {
			const res = verifyCaptain();
			if (res.status !== 'OK') return emitError(res.message);

			myTeam.updateWager(myGame.currentRound, data.wager);
			socket.to(myTeam.roomid).emit('update-wager', data);
		});

		socket.on('submit-answers', (data, cb) => {
			const res = verifyCaptain();
			if (res.status !== 'OK') return emitError(res.message);

			if (!myTeam.setResponse(myGame.currentRound)) {
				cb({
					status: 'fail',
					message: 'Your team has already submitted this round.',
				});
			} else {
				cb({
					status: 'OK',
				});

				io.to(myGame.host.id).emit('new-response', {
					round: myGame.currentRound + 1,
					format:
						myGame.currentRound !== 3
							? 'questions'
							: myGame.gameData.rounds[3].format,
					responses: myGame.getSubmissionsForRound(myGame.currentRound),
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
		});
	});
};

module.exports = socket;
