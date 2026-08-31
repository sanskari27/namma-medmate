#!/bin/sh
set -eu
awslocal s3 mb s3://namma-medmate-local-web || true
awslocal sqs create-queue --queue-name namma-medmate-local || true
awslocal sns create-topic --name namma-medmate-local || true
awslocal ssm put-parameter --name /namma-medmate/local/auth-api/oidc-audience --value namma-medmate-dispensary --type SecureString --overwrite
echo "localstack init complete"
