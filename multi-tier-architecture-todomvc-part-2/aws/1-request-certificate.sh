#!/usr/bin/env bash

DOMAIN=multitier.jeshan.co

# cloudfront currently only accepts certificates issued in us-east-1

CERTIFICATE_ARN=`aws acm request-certificate --domain-name $DOMAIN --query CertificateArn \
  --region us-east-1 --output text`

echo "Certificate $CERTIFICATE_ARN requested. Now verify your domain (probably by email), then put\
 this ARN and your domain in 4-setup-custom-domain-and-ssl.sh and run it"
