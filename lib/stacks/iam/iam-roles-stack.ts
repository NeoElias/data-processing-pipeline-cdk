import { Stack, StackProps } from "aws-cdk-lib";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class IamRolesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dataProcessingLambdaPermissions = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "firehose:PutRecord",
        "ssm:GetParameter",
      ],
      resources: ["*"],
    });

    const kinesisFirehoseS3Permissions = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:AbortMultipartUpload",
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:PutObject",
        "lambda:InvokeFunction",
        "lambda:GetFunctionConfiguration",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources: ["*"],
    });

    const redshiftLambdaPermissions = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "ssm:GetParameter",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "lambda:DeleteFunction",
      ],
      resources: ["*"],
    });

    const dataProcessingLambdaRole = new Role(
      this,
      "DataProcessingLambdaRole",
      {
        roleName: "AWSLambdaExecutionRole",
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        description: "IAM role for data processing lambda function",
      }
    );

    const redshiftLambdaRole = new Role(this, "RedshiftLambdaRole", {
      roleName: "AWSLambdaExecutionRoleRedshift",
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      description: "IAM role for Redshift table creation lambda function",
    });

    const kinesisFirehoseRole = new Role(this, "KinesisFirehoseRole", {
      roleName: "AWSKinesisFirehoseExecutionRole",
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
      description: "IAM role for kinesis firehose",
    });

    redshiftLambdaRole.addToPolicy(redshiftLambdaPermissions);
    dataProcessingLambdaRole.addToPolicy(dataProcessingLambdaPermissions);
    kinesisFirehoseRole.addToPolicy(kinesisFirehoseS3Permissions);

    new StringParameter(this, "LambdaRoleStringParameter", {
      parameterName: "/iamrole/lambda/dataprocessing/arn",
      description: "Lambda execution role arn",
      stringValue: dataProcessingLambdaRole.roleArn,
    });

    new StringParameter(this, "KinesisFirehoseRoleStringParameter", {
      parameterName: "/iamrole/kinesisfirehose/arn",
      description: "Kinesis Firehose execution role arn",
      stringValue: kinesisFirehoseRole.roleArn,
    });

    new StringParameter(this, "KinesisRedshiftStringParameter", {
      parameterName: "/iamrole/lambda/redshift/arn",
      description: "Kinesis Firehose execution role arn",
      stringValue: redshiftLambdaRole.roleArn,
    });
  }
}
