aws rekognition cloudflare worker

cf worker that uses aws rekognition to detect nsfw content in images

this also includes authentication set w/ an env var to prevent abuse.

## why on workers?

becuase you don't get charged for the time it takes for aws to return a response, you only get charged for the time it takes to execute the worker, so it's really not that expensive

and plus its easier than lambda, aws console too confusing

## setup

1. wrangler
2. aws credentials (set with `wrangler secret put`)
3. deploy to cloudflare
