import request from 'request';

// Please act responsibly. Thanks.
const remoteUrl = 'https://cb2yhbkxid.execute-api.us-east-1.amazonaws.com/dev/';

function invokeRemoteFunction({ name, method, headers, body }) {
  return new Promise((resolve, reject) => {
    const options = {
      url: remoteUrl + name,
      method,
      headers,
      body,
    };

    request(options, (err, res, body) => err ? reject(err) : resolve(body));
  });
}

export default invokeRemoteFunction;
