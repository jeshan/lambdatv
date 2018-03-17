
Run this demo by running the specified command in your terminal:


# Demo 1: S3 Event log

`aws cloudformation deploy --template-file event-log.yaml --stack-name s3-event-log --capabilities CAPABILITY_NAMED_IAM`


# Demo 2: Image tag and label

`aws cloudformation deploy --template-file image-tag.yaml --stack-name s3-image-tag --capabilities CAPABILITY_NAMED_IAM`

# Bucket events through Cloudwatch Events

`aws cloudformation deploy --template-file s3-bucket-events.yaml --stack-name s3-bucket-events --capabilities CAPABILITY_IAM`


# Upload some files
1. `aws s3 cp mountain.jpeg s3://lambdatv-s3-image-tag-${YOUR_ACCOUNT_NUMBER}`
2. `aws s3 cp leaders.jpg s3://lambdatv-s3-image-tag-${YOUR_ACCOUNT_NUMBER}`

and also
1. `aws s3 cp mountain.jpeg s3://lambdatv-s3-event-log-${YOUR_ACCOUNT_NUMBER}`
2. `aws s3 cp leaders.jpg s3://lambdatv-s3-event-log-${YOUR_ACCOUNT_NUMBER}`


# Notes
1. Since S3 bucket names may be taken by another user, I'm using account number to reduce the chance of you getting a name collision.
2. leaders.jpeg source: https://www.huffingtonpost.com/2013/06/20/mulberry-bags-g8-leaders_n_3473341.html
