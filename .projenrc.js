const {
  AwsCdkTypeScriptApp,
  DependenciesUpgradeMechanism,
  JsonFile,
} = require("projen");
const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.123.0",
  defaultReleaseBranch: "main",
  name: "cdk-s3-trigger-sfn",

  cdkDependencies: [
    "@aws-cdk/core",
    "@aws-cdk/aws-s3",
    "@aws-cdk/aws-stepfunctions",
    "@aws-cdk/aws-stepfunctions-tasks",
    "@aws-cdk/aws-cloudwatch",
    "@aws-cdk/aws-cloudtrail",
    "@aws-cdk/aws-events",
    "@aws-cdk/aws-events-targets",
    "@aws-cdk/aws-iam",
    "@aws-cdk/aws-lambda",
    "@aws-cdk/aws-lambda-python",
    "@aws-cdk/aws-lambda-nodejs",
    "@aws-cdk/aws-logs",
  ],

  deps: ["aws-sdk"],
  devDeps: ["esbuild"],
  githubOptions: {
    mergify: false,
    workflows: false,
  },

  buildWorkflow: false,
  stale: false,
  depsUpgrade: DependenciesUpgradeMechanism.NONE,
  eslintOptions: {
    prettier: true,
  },
});

new JsonFile(project, ".prettierrc", {
  obj: {
    singleQuote: false,
    trailingComma: "es5",
  },
});

project.synth();
