# aws rekognition cloudflare worker

cf worker that uses aws rekognition's `DetectModerationLabels` to check the safety of an image

this also includes scuffed auth for `/labels` endpoint, so you can't just use this worker without the secret key

## why on workers?

CF don't charge for the compute time that's caused by waiting for the rekognition api to respond, also easier to deploy than on lambda imo

## setup

1. install wrangler & authenticate with cloudflare if you haven't already
2. define aws credentials `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (set with `wrangler secret put`)
3. generate a bearer token that's cryptographically generated and set it as `BEARER_TOKEN` (or just remove the code responsible if you don't want auth)
4. deploy to cloudflare `pnpm run deploy`
