#!/usr/bin/env bash

DOMAIN=

CLOUDFRONT_DISTRIBUTION_ID=`aws cloudfront list-distributions --query \
 "DistributionList.Items[*] | [?Aliases.Items[?contains(@, '"$DOMAIN"')]] | [0].Id" --output text`

echo "Cloudfront distribution status:"
aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query Distribution.Status --output text
