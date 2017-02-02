#!/usr/bin/env bash

CERTIFICATE_ARN=
DOMAIN=
ACCOUNT_ID=`aws sts get-caller-identity --query 'Account' --output text`
API_NAME=multi-tier
REGION=`aws configure get region`

cd `dirname "$0"`

aws configure set preview.cloudfront true

sed -e 's/REGION/'${REGION}'/g; s/ACCOUNT_ID/'$ACCOUNT_ID'/g; s/API_NAME/'$API_NAME'/g; s/DOMAIN/'$DOMAIN'/g; s@CERTIFICATE_ARN@'$CERTIFICATE_ARN'@g' \
  cloudfront-distribution.template.json > cloudfront-distribution.json

CLOUDFRONT_DOMAIN=`aws cloudfront create-distribution --distribution-config\
 file://cloudfront-distribution.json --query Distribution.DomainName --output text`

echo "Great. Now, all the AWS setup has been done. In your DNS settings, modify the CNAME record\
 for $DOMAIN with value $CLOUDFRONT_DOMAIN . In about 10-15 minutes, the CloudFront distribution\
 will be created. You'll then be able to access the website at https://$DOMAIN . To check the\
 distribution status, put the domain $DOMAIN in 5-check-cloudfront-status.sh and run it."
