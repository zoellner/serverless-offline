const request = require('request');

// Please act responsibly. Thanks.
const remoteUrl = 'https://cb2yhbkxid.execute-api.us-east-1.amazonaws.com/dev/';
const localUrl = 'http://localhost:3000/';

function invokeFunction(url) {
  return ({ name, method, headers, body }) => new Promise((resolve, reject) => {
    const options = {
      url: url + name,
      method,
      headers,
      body,
    };

    request(options, (err, res, body) => err ? reject(err) : resolve(body));
  });
}

module.exports = {
  invokeRemoteFunction: invokeFunction(remoteUrl),
  invokeLocalFunction: invokeFunction(localUrl),
};
