#!/usr/bin/env bash

aws ses create-template --cli-input-json file://example-email-template.json

aws ses send-bulk-templated-email --cli-input-json file://example-email.json
