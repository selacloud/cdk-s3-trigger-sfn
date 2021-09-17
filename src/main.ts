import * as path from "path";
import { Trail } from "@aws-cdk/aws-cloudtrail";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import { Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { PythonFunction } from "@aws-cdk/aws-lambda-python";
import { BlockPublicAccess, Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import {
  Chain,
  JsonPath,
  Pass,
  StateMachine,
  TaskInput,
} from "@aws-cdk/aws-stepfunctions";
import { LambdaInvoke } from "@aws-cdk/aws-stepfunctions-tasks";
import {
  App,
  CfnOutput,
  Construct,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "@aws-cdk/core";
import { S3EventTrail } from "./s3-event-trail";

export class S3TriggerStepFn extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const sourceBucket = new Bucket(this, "SourceBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const validBucket = new Bucket(this, "ValidBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const quarantineBucket = new Bucket(this, "QuarantineBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const trail = new Trail(this, "Trail", {
      isMultiRegionTrail: false,
    });

    const sourcePutCopyObject = new S3EventTrail(this, "sourceCreateObject", {
      bucket: sourceBucket,
      trail,
    });

    const identifyFileFunction = new PythonFunction(
      this,
      "IdentifyFileFunction",
      {
        entry: path.join(__dirname, "/identify_file"),
        handler: "handler",
        runtime: Runtime.PYTHON_3_9,
        timeout: Duration.seconds(10),
      }
    );

    sourceBucket.grantRead(identifyFileFunction);

    const copyToBucketFunction = new NodejsFunction(this, "copyToBucket", {
      timeout: Duration.seconds(300),
    });

    sourceBucket.grantRead(copyToBucketFunction);
    validBucket.grantWrite(copyToBucketFunction);
    quarantineBucket.grantWrite(copyToBucketFunction);

    const parseEvent = new Pass(this, "ParseEvent", {
      parameters: {
        bucket: JsonPath.stringAt("$.detail.requestParameters.bucketName"),
        key: JsonPath.stringAt("$.detail.requestParameters.key"),
      },
    });

    const identifyTask = new LambdaInvoke(this, "IdentifyFile", {
      lambdaFunction: identifyFileFunction,
      payloadResponseOnly: true,
      resultPath: JsonPath.DISCARD,
    });

    const copyValidTask = new LambdaInvoke(this, "CopyFileValid", {
      lambdaFunction: copyToBucketFunction,
      payload: TaskInput.fromObject({
        sourceBucket: JsonPath.stringAt("$.bucket"),
        sourceKey: JsonPath.stringAt("$.key"),
        destinationBucket: validBucket.bucketName,
        destinationKey: JsonPath.stringAt("$.key"),
      }),
      payloadResponseOnly: true,
    });

    const copyQuarantineTask = new LambdaInvoke(this, "CopyFileQuarantine", {
      lambdaFunction: copyToBucketFunction,
      payload: TaskInput.fromObject({
        sourceBucket: JsonPath.stringAt("$.bucket"),
        sourceKey: JsonPath.stringAt("$.key"),
        destinationBucket: quarantineBucket.bucketName,
        destinationKey: JsonPath.stringAt("$.key"),
        error: JsonPath.stringAt("$.error"),
      }),
      payloadResponseOnly: true,
    });

    const definition = Chain.start(parseEvent)
      .next(
        identifyTask.addCatch(copyQuarantineTask, {
          errors: ["UnknownFileType"],
          resultPath: "$.error",
        })
      )
      .next(copyValidTask);

    const stateMachine = new StateMachine(this, "StateMachine", {
      definition,
    });

    sourcePutCopyObject.onEvent(
      "CreateObject",
      new SfnStateMachine(stateMachine)
    );

    new CfnOutput(this, "SourceBucketName", {
      value: sourceBucket.bucketName,
      description: "Source bucket to put files to be sorted",
    });
    new CfnOutput(this, "ValidBucketName", {
      value: validBucket.bucketName,
      description: "Bucket where valid files are placed",
    });
    new CfnOutput(this, "QuarantineBucketName", {
      value: quarantineBucket.bucketName,
      description: "Bucket where invalid files are quarantined",
    });
    new CfnOutput(this, "StepFunctionName", {
      value: stateMachine.stateMachineName,
      description: "State machine name",
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new S3TriggerStepFn(app, "quarantine-dev", { env: devEnv });
// new S3TriggerStepFn(app, 'my-stack-prod', { env: prodEnv });

app.synth();
