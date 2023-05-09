import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Role } from "aws-cdk-lib/aws-iam";
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

    const dataProcessingLambdaArn =
      StringParameter.fromStringParameterAttributes(
        this,
        "dataProcessingLambdaRoleArn",
        {
          parameterName: "/iamrole/lambda/dataprocessing/arn",
        }
      ).stringValue;

    const redshiftLambdaArn = StringParameter.fromStringParameterAttributes(
      this,
      "redshiftLambdaRoleArn",
      {
        parameterName: "/iamrole/lambda/redshift/arn",
      }
    ).stringValue;

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

    // const clusterId = StringParameter.fromStringParameterAttributes(
    //   this,
    //   "ClusterIdParameter",
    //   {
    //     parameterName: "/redshift/cluster/identifier",
    //   }
    // ).stringValue;

    const dataProcessingLambda = new PythonFunction(
      this,
      "DataProcessingLambda",
      {
        entry: "./src/lambda/data-processing",
        runtime: Runtime.PYTHON_3_10,
        index: "main.py",
        handler: "lambda_handler",
        timeout: Duration.minutes(1),
        role: Role.fromRoleArn(
          this,
          "DataProcessingLambdaRole",
          dataProcessingLambdaArn
        ),
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
        role: Role.fromRoleArn(
          this,
          "RedshiftTableLambdaRole",
          redshiftLambdaArn
        ),
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
