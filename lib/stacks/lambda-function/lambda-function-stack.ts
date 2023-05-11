import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import cluster from "cluster";

export class LambdaFunctionStack extends Stack {
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
    dataProcessingLambdaRole.addToPolicy(dataProcessingLambdaPermissions);

    const redshiftLambdaRole = new Role(this, "RedshiftLambdaRole", {
      roleName: "AWSLambdaExecutionRoleRedshift",
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      description: "IAM role for Redshift table creation lambda function",
    });

    redshiftLambdaRole.addToPolicy(redshiftLambdaPermissions);

    const dynamoTableStreamArn = StringParameter.fromStringParameterAttributes(
      this,
      "DynamoTableStreamArnParameter",
      {
        parameterName: "/dynamodb/table/stream/arn",
      }
    ).stringValue;

    const dynamoTableArn = StringParameter.fromStringParameterAttributes(
      this,
      "DynamoTableArnParameter",
      {
        parameterName: "/dynamodb/table/arn",
      }
    ).stringValue;

    const dataProcessingLambda = new PythonFunction(
      this,
      "DataProcessingLambda",
      {
        entry: "./src/lambda/data-processing",
        runtime: Runtime.PYTHON_3_10,
        index: "main.py",
        handler: "lambda_handler",
        timeout: Duration.minutes(1),
        role: dataProcessingLambdaRole,
      }
    );

    const redshiftTableLambda = new PythonFunction(
      this,
      "RedshiftTableLambda",
      {
        entry: "./src/lambda/redshift-table",
        runtime: Runtime.PYTHON_3_10,
        index: "main.py",
        handler: "lambda_handler",
        timeout: Duration.minutes(1),
        role: redshiftLambdaRole,
      }
    );
    const table = Table.fromTableAttributes(this, "Table", {
      tableArn: dynamoTableArn,
      tableStreamArn: dynamoTableStreamArn,
    });

    dataProcessingLambda.addEventSource(
      new DynamoEventSource(table, {
        startingPosition: StartingPosition.LATEST,
      })
    );
    redshiftTableLambda.addEventSource(
      new DynamoEventSource(table, {
        startingPosition: StartingPosition.LATEST,
      })
    );

    // const eventRule = new Rule(this, "MyEventRule", {
    //   eventPattern: {
    //     source: ["aws.redshift"],
    //     detailType: ["Redshift Cluster State Change"],
    //     detail: {
    //       clusterIdentifier: ["data-processing"],
    //       newState: ["available"],
    //     },
    //   },
    // });

    // eventRule.addTarget(new LambdaFunction(redshiftTableLambda));
  }
}
