// errors

function RequestError(code, message) {

}
RequestError.prototype = Object.create(Error.prototype);

exports.RequestError = RequestError;
