#!/usr/bin/env bash

cd `dirname "$0"`

# presentation tier: S3
DOMAIN=
REGION=`aws configure get region`

# create the site bucket. must be the same name as your domain
aws s3 mb s3://$DOMAIN

cd ../site/
aws s3 sync . s3://$DOMAIN --acl public-read

aws s3 website s3://$DOMAIN --index-document index.html

cd ..

echo "Your website is now available at http://$DOMAIN.s3-website-$REGION.amazonaws.com"
echo "Now a CNAME record for $DOMAIN that has value: $DOMAIN.s3-website-$REGION.amazonaws.com"

echo "After the DNS record propagates, your website will be available at\
 http://$DOMAIN"
echo "If you want to continue setting up CDN and SSL on your own domain, \
add $DOMAIN to 3-setup-custom-domain-and-ssl.sh and then run it"

