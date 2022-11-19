export const getEmbeddedLink = (media, startingTime) => {
	if (media.length === 0)
		return {
			status: 'fail',
			message: 'No link given',
		};
	if (
		media.toLowerCase().indexOf('youtube') < 0 &&
		media.toLowerCase().indexOf('youtu.be') < 0 &&
		media.toLowerCase().indexOf('vimeo') < 0 &&
		media.toLowerCase().indexOf('drive.google.com/file/d') < 0
	) {
		return {
			status: 'fail',
			message: 'Only YouTube, Google Drive, and Vimeo videos are supported.',
		};
	}
	if (media.toLowerCase().indexOf('youtube.com/embed') >= 0) {
		const tokens = media.split('/');
		const videoID = tokens[tokens.length - 1];
		if (videoID.toLowerCase() === 'embed') {
			return {
				status: 'fail',
				message:
					'Could not parse video link - video ID not found. Check your link.',
			};
		}
		return {
			status: 'success',
			link: `https://www.youtube.com/embed/${videoID}${
				startingTime > 0 ? '?start=' + startingTime : ''
			}`,
		};
	} else if (media.toLowerCase().indexOf('youtube') >= 0) {
		const tokens = media.split('&');
		if (tokens.length === 0) {
			return {
				status: 'fail',
				message: 'Could not parse video link. Check your link.',
			};
		}
		const videoID = tokens[0].split('=')[1];
		if (!videoID) {
			return {
				status: 'fail',
				message: 'Could not parse video link. Check your link.',
			};
		}
		return {
			status: 'success',
			link: `https://www.youtube.com/embed/${videoID}${
				startingTime > 0 ? '?start=' + startingTime : ''
			}`,
		};
	} else if (media.toLowerCase().indexOf('youtu.be') >= 0) {
		const tokens = media.split('/');
		if (tokens.length < 2) {
			return {
				status: 'fail',
				message: 'Could not parse video link. Check your link.',
			};
		}
		const videoID = tokens[tokens.length - 1];
		if (!videoID) {
			return {
				status: 'fail',
				message: 'Could not parse video link. Check your link.',
			};
		}
		return {
			status: 'success',
			link: `https://www.youtube.com/embed/${videoID}${
				startingTime > 0 ? '?start=' + startingTime : ''
			}`,
		};
	} else if (media.toLowerCase().indexOf('vimeo') >= 0) {
		const tokens = media.split('/');
		if (tokens.length < 2) {
			return {
				status: 'fail',
				message: 'Could not parse video link. Check your link.',
			};
		}
		const videoID = tokens[tokens.length - 1];
		return {
			status: 'success',
			link: `https://player.vimeo.com/video/${videoID}${
				startingTime > 0 ? '#t=' + startingTime : ''
			}`,
		};
	} else if (media.toLowerCase().indexOf('drive.google.com/file/d') >= 0) {
		const tokens = media.split('/');
		if (tokens.length < 4) {
			return {
				status: 'fail',
				message:
					'Could not parse Google Drive link - link should start with https://drive.google.com/file/d',
			};
		}
		let videoID;
		tokens.some((t, i) => {
			if (t === 'd') {
				if (i !== tokens.length - 1) {
					videoID = tokens[i + 1];
					return true;
				}
			}
			return false;
		});
		if (!videoID) {
			return {
				status: 'fail',
				message: 'Could not parse Google Drive link - no file ID found.',
			};
		} else {
			return {
				status: 'success',
				link: `https://drive.google.com/file/d/${videoID}/preview${
					startingTime > 0 ? '/view?t=' + startingTime : ''
				}`,
			};
		}
	}
};
