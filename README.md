# Automated Data Processing Pipeline Using AWS CDK

## About

The pipeline automatically processes data coming from DynamoDB table and sends data into a Redshift table. The data should be mapped accordingly to the matching columns in the destination table. The project leverages infrastructure as code (IaC) using AWS CDK to provision the necessary pipeline infrastructure.

## Architecture

![Automated data processing pipeline architecture](./assets/data-pipeline-architecture.png)

## Acknowledgements

This project is based on an article that can be found [here](https://www.linkedin.com/pulse/aws-automated-data-processing-pipeline-dynamodb-stream-v-y-reddy/). I gratefully acknowledge the author for providing the project prompt.
