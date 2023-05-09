#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import {
  DynamoDBStack,
  IamRolesStack,
  LambdaFunctionStack,
  KinesisFirehoseStack,
} from "../lib/index";

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const iamRolesStack = new IamRolesStack(app, "NeoIamRolesStack");
new DynamoDBStack(app, "NeoDynamoDBStack");
const kinesisFirehoseStack = new KinesisFirehoseStack(
  app,
  "NeoKinesisFirehoseStack",
  { env: env }
);
// new S3BucketStack(app, "NeoS3BucketStack");
const lambdaFunctionStack = new LambdaFunctionStack(
  app,
  "NeoLambdaFunctionStack"
);
lambdaFunctionStack.addDependency(iamRolesStack);
kinesisFirehoseStack.addDependency(iamRolesStack);
kinesisFirehoseStack.addDependency(lambdaFunctionStack);
