import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as redshift from "aws-cdk-lib/aws-redshift";
import { Topic } from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { CfnCustomResource } from "aws-cdk-lib/aws-cloudformation";
import { Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

export class KinesisFirehoseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const streamTestBucket = new Bucket(this, "StreamTestBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
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

    const kinesisFirehoseRole = new Role(this, "KinesisFirehoseRole", {
      roleName: "AWSKinesisFirehoseExecutionRole",
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
      description: "IAM role for kinesis firehose",
    });

    kinesisFirehoseRole.addToPolicy(kinesisFirehoseS3Permissions);

    const cluster = new redshift.CfnCluster(this, "Cluster", {
      clusterType: "single-node",
      numberOfNodes: 1,
      dbName: "dev-db",
      masterUsername: "redshift_user",
      masterUserPassword: "Password123",
      nodeType: "dc2.large",
      publiclyAccessible: true,
      clusterIdentifier: "data-processsing",
    });

    const kinesisFirehoseDeliveryStream = new kinesisfirehose.CfnDeliveryStream(
      this,
      "KinesisFireHoseDeliveryStream",
      {
        deliveryStreamName: "Neo-KDS-S3-DataStream",
        deliveryStreamType: "DirectPut",
        redshiftDestinationConfiguration: {
          clusterJdbcurl: `jdbc:redshift://${cluster.attrEndpointAddress}:${cluster.attrEndpointPort}/${cluster.dbName}`,
          copyCommand: {
            dataTableName: "testdata",
            copyOptions: "json 'auto'",
            dataTableColumns: "id,firstname,lastname,age",
          },
          password: cluster.masterUserPassword,
          roleArn: kinesisFirehoseRole.roleArn,
          cloudWatchLoggingOptions: {
            enabled: true,
            logGroupName: "delivery-stream-log-group",
            logStreamName: "delivery-stream-log-stream",
          },

          username: cluster.masterUsername,
          s3Configuration: {
            bucketArn: streamTestBucket.bucketArn,
            roleArn: kinesisFirehoseRole.roleArn,
            cloudWatchLoggingOptions: {
              enabled: true,
              logGroupName: "s3-log-group",
              logStreamName: "s3-log-stream",
            },
            bufferingHints: {
              intervalInSeconds: 60,
              sizeInMBs: 1,
            },
          },
        },
      }
    );
    new StringParameter(this, "RedshiftClusterIdentifier", {
      parameterName: "/redshift/cluster/identifier",
      description: "Redshift cluster identifier",
      stringValue: cluster.clusterIdentifier!,
    });

    new StringParameter(this, "RedshiftClusterEndpoint", {
      parameterName: "/redshift/cluster/endpoint",
      description: "Redshift cluster endpoint address",
      stringValue: cluster.attrEndpointAddress,
    });

    new StringParameter(this, "RedshiftClusterPort", {
      parameterName: "/redshift/cluster/port",
      description: "Redshift cluster endpoint port",
      stringValue: cluster.attrEndpointPort,
    });

    new StringParameter(this, "RedshiftDbName", {
      parameterName: "/redshift/cluster/dbname",
      description: "Redshift cluster database name",
      stringValue: cluster.dbName,
    });

    new StringParameter(this, "RedshiftDbUser", {
      parameterName: "/redshift/cluster/dbuser",
      description: "Redshift cluster database username",
      stringValue: cluster.masterUsername,
    });

    new StringParameter(this, "RedshiftDbPassword", {
      parameterName: "/redshift/cluster/dbpassword",
      description: "Redshift cluster database password",
      stringValue: cluster.masterUserPassword,
    });

    new StringParameter(this, "KinesisFirehoseDeliveryStreamParameter", {
      parameterName: "/kinesisfirehose/deliverystream/name",
      description: "Kinesis Firehose delivery stream name",
      stringValue: kinesisFirehoseDeliveryStream.deliveryStreamName!,
    });
  }
}
