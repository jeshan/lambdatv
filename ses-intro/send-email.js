const SES = require('aws-sdk').SES;

exports.handler = (event, context, callback) => {
  let Source = event.source;
  let ToAddresses = event.toAddresses;

  let subject = event.subject || 'Test email subject';
  if (typeof ToAddresses === 'string') {
    ToAddresses = [ToAddresses];
  }

  const Charset = 'UTF-8';
  // needs ses:SendEmail permission
  new SES().sendEmail({
    Destination: {ToAddresses},
    Message: {
      Body: {
        Html: {
          Charset,
          Data: "This message is in HTML and can contain <a class=\"ulink\" href=\"http://lambdatv.com\" target=\"_blank\">links</a>."
        },
        Text: {
          Charset,
          Data: "This message is in text format."
        }
      },
      Subject: {
        Charset,
        Data: subject
      }
    },
    Source
  }, callback);
};
