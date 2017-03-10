import invokeRemoteFunction from './invokeRemoteFunction';
import awsServiceHandlers from './aws-service/handler';

// For every lambda function, we assume the handler name, the function name and the route path are the same
const handlerNames = Object.keys(awsServiceHandlers);

console.log('handlerNames:', handlerNames);
