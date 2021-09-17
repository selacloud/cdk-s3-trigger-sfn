import * as AWS from "aws-sdk";

interface CopyEvent {
  sourceBucket: string;
  sourceKey: string;
  destinationBucket: string;
  destinationKey: string;
}

const s3 = new AWS.S3();

export async function handler(event: CopyEvent) {
  await s3
    .copyObject({
      CopySource: `${event.sourceBucket}/${event.sourceKey}`,
      Bucket: event.destinationBucket,
      Key: event.destinationKey,
    })
    .promise();
  return event;
}
