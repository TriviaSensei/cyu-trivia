const srvr = location.origin;

export const handleRequest = (
	requestStr,
	requestType,
	requestBody,
	responseHandler
) => {
	const req = new XMLHttpRequest();
	// console.log(requestBody);
	if (req.readyState === 0 || req.readyState === 4) {
		req.open(requestType.toUpperCase(), `${srvr}${requestStr}`, true);
		req.onreadystatechange = () => {
			if (req.readyState == 4) {
				if (req.status !== 204) {
					const res = JSON.parse(req.response);
					responseHandler(res);
				} else {
					responseHandler(res);
				}
			}
		};
		req.setRequestHeader('Content-type', 'application/json; charset=utf-8');
		try {
			if (requestBody) {
				req.send(JSON.stringify(requestBody));
			} else {
				req.send(null);
			}
		} catch (err) {
			console.log(`err`);
		}
	}
};

export const handleMultiRequest = (
	requestStr,
	requestType,
	formData,
	responseHandler
) => {
	const req = new XMLHttpRequest();
	if (req.readyState === 0 || req.readyState === 4) {
		req.open(requestType.toUpperCase(), `${srvr}${requestStr}`);
		req.onreadystatechange = () => {
			if (req.readyState == 4) {
				const res = JSON.parse(req.response);
				responseHandler(res);
			}
		};
		req.send(formData);
	}
};
