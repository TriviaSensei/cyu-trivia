const { v4: uuidv4 } = require('uuid');
const { reqTimeout } = require('../settings');

module.exports = class Team {
	constructor(name, captain, game) {
		this.name = name;
		this.id = uuidv4();
		this.roomid = uuidv4();
		this.members = [captain];
		this.chat = [];
		this.submissions = [];
		this.game = game;
		for (var i = 0; i < game.roundCount; i++) {
			this.submissions.push({
				round: i + 1,
				answers: [],
				wager: undefined,
				result: [],
				adjustment: 0,
				score: 0,
				final: false,
			});
		}
		this.joinRequests = [];
		this.deniedRequests = [];
		this.captain = captain;
		this.active = true;
	}

	containsPlayer(id) {
		return this.members.some((m) => {
			return m.id === id;
		});
	}

	removePlayer(id) {
		this.members = this.members.filter((m) => {
			return m.id !== id;
		});
		if (this.captain.id === id) this.changeCaptain(true);
	}

	addPlayer(player) {
		if (
			!this.members.some((m) => {
				return m.id === player.id;
			})
		)
			this.members.push(player);
	}

	//change the captain of the team
	//force - whether to force the system to change captains, if possible
	//id (optional) - the user id to assign as the captain, if they're connected.
	//returns: the user object that is the new captain (or undefined if the captain was not assigned,
	//	in which case the previous captain is retained
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

	addJoinRequest(player) {
		if (
			!this.joinRequests.find((jr) => {
				return jr.player.id === player.id;
			})
		) {
			this.joinRequests.push({
				player,
				created: undefined,
			});
		}
	}

	setJoinTimer() {
		if (this.joinRequests.length === 0) return;
		this.joinRequests[0].created = new Date();
		const id = this.joinRequests[0].player.id;
		setTimeout(this.removeJoinRequest, reqTimeout, this, id);
	}

	removeJoinRequest(team, userid) {
		team.joinRequests = team.joinRequests.filter((jr) => {
			return jr.player.id !== userid || jr.created + reqTimeout > new Date();
		});
	}

	cancelJoinRequest(userid) {
		let toReturn = undefined;
		this.joinRequests = this.joinRequests.filter((jr) => {
			if (jr.player.id === userid) {
				toReturn = jr.player;
				return false;
			}
			return true;
		});
		return toReturn;
	}

	addChatMessage(user, text) {
		let toReturn = {
			mid: uuidv4(),
			user,
			isHost: false,
			text,
		};
		this.chat.push(toReturn);
		return toReturn;
	}

	updateResponse(round, question, answer) {
		if (round < this.submissions.length) {
			if (!this.submissions[round].final) {
				while (this.submissions[round].answers.length <= question) {
					this.submissions[round].answers.push('');
				}
				this.submissions[round].answers[question] = answer;
			}
		}
	}

	updateWager(round, wager) {
		if (round < this.submissions.length && !this.submissions[round].final) {
			const maxWager = round % 2 === 0 ? (round === 6 ? 20 : 10) : 0;
			this.submissions[round].wager = Math.min(wager, maxWager);
		}
	}

	setResponse(round) {
		if (round < this.submissions.length) {
			if (this.submissions[round].final)
				return {
					status: 'fail',
					message: 'This round has already been submitted.',
				};
			this.submissions[round].final = true;
			this.game.addSubmission(round, this.submissions[round]);
			return {
				status: 'OK',
			};
		}
		return {
			status: 'fail',
			message: 'Invalid round number',
		};
	}

	getResponse(round) {
		if (round < this.submissions.length) {
			return this.submissions[round];
		}
		return null;
	}

	setAdjustment(round, adj) {
		if (round >= 0 && round < this.submissions.length) {
			this.submissions[round].adjustment = adj;
		}
	}
};
