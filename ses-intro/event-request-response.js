const AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
  // console.log('Received event:', JSON.stringify(event, null, 2));
  const ses = event.Records[0].ses;
  const mail = ses.mail;

  const {timestamp, source, messageId} = mail;
  const {date, to, subject} = mail.commonHeaders;

  console.log(`source ${source} to ${to} subject ${subject}`);

  const emailDomain = 'jeshan.co';
  if (source.endsWith('@' + emailDomain)) {
    sendBounce(messageId, emailDomain, ses.receipt, callback);
    return;
  }
  console.log('Accepted this email, proceeding to next rule');
  callback();
};

function sendBounce(messageId, emailDomain, receipt, callback) {
  // needs ses:SendBounce permission
  const sendBounceParams = {
    BounceSender: 'testing-bounce@email.com', // must have been verified with SES
    OriginalMessageId: messageId,
    MessageDsn: {
      ReportingMta: `dns; ${emailDomain}`,
      ArrivalDate: new Date(),
      ExtensionFields: [],
    },
    Explanation: "We're rejecting your email because your domain sucks",
    BouncedRecipientInfoList: receipt.recipients.map((recipient) => ({
      Recipient: recipient,
      BounceType: 'ContentRejected',
    })),
  };
  new AWS.SES().sendBounce(sendBounceParams, (err, data) => {
    if (err) {
      console.log(`An error occurred while sending bounce for message: ${messageId}`, err);
      callback(err);
      // Otherwise, log the message ID for the bounce email.
    } else {
      console.log(`Bounce for message ${messageId} sent, bounce message ID: ${data.MessageId}`);
      // Stop processing additional receipt rules in the rule set.
      callback(null, {disposition: 'stop_rule_set'});
    }
  });
}
