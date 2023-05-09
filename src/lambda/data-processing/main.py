import boto3
import logging
import json
from dynamodb_json import json_util
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.client('dynamodb')
ssm = boto3.client('ssm')
firehose = boto3.client('firehose')

def lambda_handler(event, context):
    
    for record in event['Records']:
      logger.info(f'Received a record: {json.dumps(event)}')

      if record['eventName'] == 'INSERT':
        new_image = json_util.loads(record['dynamodb']['NewImage'])
        print(new_image)

        delivery_stream_name = get_delivery_stream_name()
        print(delivery_stream_name)

        try:
          response = firehose.put_record(
          DeliveryStreamName=delivery_stream_name,
          Record={'Data': json.dumps(new_image)}
          )
          print(response)
        except:
          logger.error(f'Error occurred sending record to delivery stream')
          raise
  
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'DynamoDB streams records successfully processed'})
    }
    
def get_delivery_stream_name():
  try:
    response = ssm.get_parameter(Name="/kinesisfirehose/deliverystream/name")
    return response['Parameter']['Value']
  except:
    logger.error(f'Error occurred retrieving SSM parameter')
    raise
