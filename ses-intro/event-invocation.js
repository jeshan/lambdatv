
exports.handler = (event, context, callback) => {
  // console.log('Received event:', JSON.stringify(event, null, 2));
  const mail = event.Records[0].ses.mail;

  const {timestamp, source, messageId} = mail;
  const receivedHeader = (mail.headers.find((x) => x.name === 'X-Received') || {}).value;
  // console.log('received header', receivedHeader); // example how you can read headers

  const {from, date, to, subject} = mail.commonHeaders;

  console.log('received mail', mail);

  callback(null, {from: from[0], to: to[0], subject, date, timestamp, source, messageId});
};
