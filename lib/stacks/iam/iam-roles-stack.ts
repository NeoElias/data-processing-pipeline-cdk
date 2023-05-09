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

    // const dynamodbStreamArn = StringParameter.fromStringParameterAttributes(
    //   this,
    //   "StringParameter",
    //   {
    //     parameterName: "/dynamodb/table/arn",
    //   }
    // ).stringValue;

    // const lambdaDynamoDBPermissions = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: [
    //     "dynamodb:GetRecords",
    //     "dynamodb:GetShardIterator",
    //     "dynamodb:DescribeStream",
    //     "dynamodb:ListStreams",
    //   ],
    //   resources: [dynamodbStreamArn],
    // });

    // const CloudWatchPermissions = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: [
    //     "logs:CreateLogGroup",
    //     "logs:CreateLogStream",
    //     "logs:PutLogEvents",
    //   ],
    //   resources: ["*"],
    // });

    // const lambdaKinesisFirehosePermissions = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: [
    //     "kinesis:DescribeStream",
    //     "kinesis:DescribeStreamSummary",
    //     "kinesis:GetRecords",
    //     "kinesis:GetShardIterator",
    //     "kinesis:ListShards",
    //     "kinesis:ListStreams",
    //     "kinesis:SubscribeToShard",
    //   ],
    //   resources: [dynamodbStreamArn],
    // });

    // const kinesisFirehoseS3Permissions = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: [
    //     "s3:AbortMultipartUpload",
    //     "s3:GetBucketLocation",
    //     "s3:GetObject",
    //     "s3:ListBucket",
    //     "s3:ListBucketMultipartUploads",
    //     "s3:PutObject",
    //   ],
    //   resources: [], // bucket arn here
    // });

    // const kinesisFirehoseStreamPermissions = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: [
    //     "kinesis:DescribeStream",
    //     "kinesis:GetShardIterator",
    //     "kinesis:GetRecords",
    //     "kinesis:ListShards",
    //   ],
    //   resources: [], // arn for kinesis stream here
    // });

    // const kinesisFirehoseLambdaPermissions = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: ["lambda:InvokeFunction", "lambda:GetFunctionConfiguration"],
    //   resources: [], // arn for lambda function here
    // });

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

    redshiftLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonRedshiftDataFullAccess")
    );

    redshiftLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess")
    );
    redshiftLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
    );
    redshiftLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess")
    );

    dataProcessingLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
    );
    dataProcessingLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
    );
    dataProcessingLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonKinesisFirehoseFullAccess")
    );
    dataProcessingLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess")
    );

    kinesisFirehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
    );
    kinesisFirehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess")
    );
    kinesisFirehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonRedshiftQueryEditor")
    );
    kinesisFirehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
    );

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

    // lambdaRole.addToPolicy(lambdaDynamoDBPermissions);
    // lambdaRole.addToPolicy(lambdaKinesisFirehosePermissions);
    // lambdaRole.addToPolicy(CloudWatchPermissions);

    // kinesisFirehoseRole.addToPolicy(kinesisFirehoseS3Permissions);
    // kinesisFirehoseRole.addToPolicy(kinesisFirehoseStreamPermissions);
    // kinesisFirehoseRole.addToPolicy(kinesisFirehoseLambdaPermissions);
    // kinesisFirehoseRole.addToPolicy(CloudWatchPermissions);
  }
}
