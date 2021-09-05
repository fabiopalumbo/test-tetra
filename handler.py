import logging
import os
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import requests
import botocore
import boto3

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']


def publish_to_sns(sub, msg):
    topic_arn = os.environ['SNS_TOPIC']
    sns = boto3.client("sns")
    response = sns.publish(
        TopicArn=topic_arn,
        Message=msg,
        Subject=sub
    )

def handle_event(event, context):
    """
    S3 Object Lambda handler. Performs on-the-fly conversion of Json to YAML
    """
    logger.info(event)

    get_obj_ctx = event['getObjectContext']
    request_route = get_obj_ctx['outputRoute']
    request_token = get_obj_ctx['outputToken']
    obj_url = get_obj_ctx['inputS3Url']
    requested_url = event['userRequest']['url']
    path = Path(urlparse(requested_url).path).relative_to('/')

    response = requests.get(obj_url)
    resp = {'StatusCode': response.status_code}

    if response.status_code == 404 and path.suffix == '.yaml':
        # Load JSON and convert to Yaml.
        json_key = str(path.with_suffix('.json'))
        try:
            json_body = s3_client.get_object(Bucket=bucket_name, Key=json_key)['Body']
            resp['Body'] = pd.read_json(json_body).to_yaml()
            print('## File Uploaded')
            print(json_key)            
            num_lines = sum(1 for line in open(json_key))
            print('## Number of Lines')
            print(num_lines)
            resp['StatusCode'] = 200
        except botocore.exceptions.ClientError as error:
            resp['ErrorCode'] = error.response['Error']['Code']
            resp['StatusCode'] = error.response['ResponseMetadata']['HTTPStatusCode']
            resp['ErrorMessage'] = error.response['Error']['Message']
    elif response.status_code == 404 and path.suffix == '.json':
        # Load Yaml and convert to Json.
        yaml_key = str(path.with_suffix('.yaml'))
        try:
            yaml_body = s3_client.get_object(Bucket=bucket_name, Key=yaml_key)['Body']
            resp['Body'] = pd.read_yaml(yaml_body).to_json()
            num_lines = sum(1 for line in open(yaml_key))
            print('## Number of Lines')
            print(num_lines)            
            resp['StatusCode'] = 200
        except botocore.exceptions.ClientError as error:
            resp['ErrorCode'] = error.response['Error']['Code']
            resp['StatusCode'] = error.response['ResponseMetadata']['HTTPStatusCode']
            resp['ErrorMessage'] = error.response['Error']['Message']    
    else:
        resp['Body'] = response.content

    s3_client.write_get_object_response(
        RequestRoute=request_route,
        RequestToken=request_token,
        **resp
    )

    publish_to_sns("test", "error")

    return {'status_code': 200}
