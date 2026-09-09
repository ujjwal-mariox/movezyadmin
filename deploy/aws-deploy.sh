#!/usr/bin/env bash
# Build and publish the Movezy web bundle (public site at "/", admin at "/admin")
# to S3 + CloudFront. Run from the repository root.
#
# One-time setup (see README.md):
#   - S3 bucket (index: index.html, error: 404.html)
#   - CloudFront distribution with the ACM certificate and deploy/cloudfront-rewrite.js
#     attached as a viewer-request function
#   - Route 53 A/AAAA alias records → the distribution
# Required env: S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID (and AWS credentials/profile).
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET (e.g. www.movezy.in)}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"

npm ci
npm run build   # admin → dist/admin, then the public site → dist/

# Hashed assets: cache for a year. HTML and metadata files: always revalidate.
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --delete \
  --exclude "*.html" --exclude "sitemap.xml" --exclude "robots.txt" --exclude "site.webmanifest" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --exclude "*" --include "*.html" --include "sitemap.xml" --include "robots.txt" --include "site.webmanifest" \
  --cache-control "public,max-age=0,must-revalidate"

aws cloudfront create-invalidation --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" --paths "/*" >/dev/null
echo "Deployed dist/ to s3://${S3_BUCKET} and invalidated CloudFront ${CLOUDFRONT_DISTRIBUTION_ID}"
