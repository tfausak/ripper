const parseReplay = (event, callback) => {
  const error = null;
  const success = true;

  console.log(
    event.eventId, // String
    event.timestamp, // String (ISO 8601)
    event.eventType, // String
    event.resource, // String
    event.data); // Object
  callback(error, success);
};

module.exports = {parseReplay};
