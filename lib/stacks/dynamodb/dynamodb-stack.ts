import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class DynamoDBStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, "Table", {
      tableName: "People",
      partitionKey: { name: "id", type: AttributeType.NUMBER },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new StringParameter(this, "StreamArnParameter", {
      parameterName: "/dynamodb/table/stream/arn",
      description: "DynamoDB stream arn",
      stringValue: table.tableStreamArn!,
    });

    new StringParameter(this, "TableArnParameter", {
      parameterName: "/dynamodb/table/arn",
      description: "DynamoDB table arn",
      stringValue: table.tableArn,
    });
  }
}
