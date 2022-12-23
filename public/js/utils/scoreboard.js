import { createElement } from '../utils/createElementFromSelector.js';

export const generateScoreboard = (slideBody, data) => {
	console.log(data);
	const sb = createElement('.scoreboard');
	slideBody.appendChild(sb);
	let prev;
	data.forEach((d, i) => {
		const r = createElement('.scoreboard-row');
		if (d.myTeam) r.classList.add('my-team');
		const teamLabel = createElement('.sb-team-label');
		teamLabel.innerHTML = d.name;
		const scoreLabel = createElement('.score');
		const scoreInner = createElement('div');
		scoreInner.innerHTML = d.score;
		scoreLabel.appendChild(scoreInner);
		r.appendChild(teamLabel);
		r.appendChild(scoreLabel);
		setTimeout(() => {
			if (prev) {
				sb.insertBefore(r, prev);
			} else {
				sb.appendChild(r);
			}
			prev = r;
		}, 1500 * i + 1000);
	});
};
