# Identify and quarantine files from S3 bucket PoC

## Installation and deployment

- Clone repo: `git clone git@github.com:foresighttech/cdk-s3-trigger-sfn.git`
- Yarn init: `yarn`
- [projen](https://github.com/projen/projen) init: `npx projen`
- projen deploy (using shell credentials): `npx projen deploy`

## Example files

Upload `exampleFiles/invalidFile.json` and `exampleFiles/validFile.json` to the source bucket, and they will be sorted into the valid and quarantine buckets.

## Project structure

- `.projenrc` - project configuration file (using [Projen](https://github.com/projen/projen))
- `src/main.ts` - Main infrastructure definition using AWS CDK, including buckets and Step Functions definition
- `src/s3-event-trail.ts` - CDK construct that allows S3 events to trigger Step functions using CloudTrail
- `src/main.copyToBucket.ts` - NodeJS lambda function that copies from a source bucket to a destination bucket defined in the event
- `src/identify_file` - Python lambda function that looks for specific fields in a provided JSON file and raises an error if not found
- `exampleFiles/` - Example files for this POC

## Remove deployment

- `npx projen destroy`
