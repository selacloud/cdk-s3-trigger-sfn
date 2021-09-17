import * as cloudtrail from "@aws-cdk/aws-cloudtrail";
import * as events from "@aws-cdk/aws-events";
import { IRuleTarget } from "@aws-cdk/aws-events";
import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";

export interface S3EventTrailProps {
  bucket: s3.IBucket;
  trail: cloudtrail.Trail;
}

export class S3EventTrail extends cdk.Construct {
  private readonly bucketName: string;

  constructor(
    scope: cdk.Construct,
    id: string,
    { bucket, trail }: S3EventTrailProps
  ) {
    super(scope, id);

    this.bucketName = bucket.bucketName;

    trail.addS3EventSelector([{ bucket }], {
      readWriteType: cloudtrail.ReadWriteType.WRITE_ONLY,
    });
  }

  public onEvent(id: string, target: IRuleTarget, prefix?: string) {
    const rule = new events.Rule(this, id, {
      eventPattern: {
        source: ["aws.s3"],
        detailType: ["AWS API Call via CloudTrail"],
        detail: {
          eventName: ["PutObject"],
          // eventName: ["PutObject", "CopyObject"],
          requestParameters: {
            bucketName: [this.bucketName],
            key: prefix ? [{ prefix }] : undefined,
          },
        },
      },
    });
    rule.addTarget(target);
    return rule;
  }
}
export interface OnEventOptions extends events.RuleTargetConfig {
  target: events.IRuleTarget;
}
