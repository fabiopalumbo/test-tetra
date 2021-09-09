# test-tetra
Cloudformation exercise

```
Here is the Cloud Formation exercise which we would like Fabio to complete
“Create an AWS cloud application packed in a cloudformation template, containing any  resources you think are needed.
Requirements:
1.  One of the template resources will be an s3 bucket. It will be as secure as possible.
2.  Whenever a new file is uploaded to the bucket, the application will:
	- If the file’s extension is yaml, convert it to json and save it to the bucket
	- If the file’s extension is json, convert it to yaml and save the copy to the same bucket
	- If the file has another extension, or if there are any other errors in processing, send a notification to an email address configured as a stack parameter.
	- log to cloudwatch the received file’s name and the number of lines in it.
3. Another template resource will be an IAM role that will allow EC2 instances that assume it to list the bucket contents and to read only the yaml files. 
4. The template will export the ARNs of the bucket and the IAM role.
5. For extra points: the bucket will automatically  be named ‘tetra-<candidate_first_name>-<dow>’ where dow is the day of the week at the time of stack deployment (ie - Monday). Hint - use a custom resource.
6. For extra points: include in the template a cloudwatch graph showing the number of files processed.
Note: The code submitted should be concise, commented and production ready.”
```

# tetra-lambda-transform

An S3 Object Lambda, converting YAML <-> Json

## Introduction

Fetching and transforming data from S3 using AWS Lambda is one of the most common serverless patterns. The new S3 Object Lambda feature allows a Lambda to be invoked on demand as part of the lifecycle of S3 GetObject. This opens up a new set of possibilities. Objects can be transformed, filtered and generated on the fly without adding higher level access points like API Gateways.

## Diagram
![Diagram](diagram.png "Diagram")


## Build and test locally

The AWS SAM command line interface (CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

If you prefer to use an integrated development environment (IDE) to build and test your application, you can use the AWS Toolkit. The AWS Toolkit is an open-source plugin for popular IDEs that uses the AWS SAM CLI to build and deploy serverless applications on AWS. The AWS Toolkit also adds step-through debugging for Lambda function code.

## Build

Build your application with the sam build command.
```
sam build -m package.json
```

## Deployment

The deployment consists of a Lambda Function, IAM Role, Log Group, SNS, Custom Date Resource, Cloudwatch dashboard, S3 Bucket and Dead Letter Queue (can send information about an asynchronous request when processing fails).

Deployment uses sam. Ref. https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-linux.html

```
#Step 1 
sam init

#Step 2 
sam build

#Step 3
sam deploy --guided


        Deploying with following values
        ===============================
        Stack name                   : lambda-s3
        Region                       : us-east-1
        Confirm changeset            : True
        Deployment s3 bucket         : aws-sam-cli-managed-default-samclisourcebucket-166345w5emy53
        Capabilities                 : ["CAPABILITY_IAM"]
        Parameter overrides          : {"candidatename": "test", "notificationemail": "test@test.com"}
        Signing Profiles             : {}

Initiating deployment
=====================
File with same data already exists at lambda-s3/c5ca7a202286aaa6432cf1ebb04b1b98.template, skipping upload

Waiting for changeset to be created..

CloudFormation stack changeset
---------------------------------------------------------------------------------------------------------------------
Operation                     LogicalResourceId             ResourceType                  Replacement
---------------------------------------------------------------------------------------------------------------------
+ Add                         LambdaFunctionRole            AWS::IAM::Role                N/A
+ Add                         LambdaFunctionbucketEventjs   AWS::Lambda::Permission       N/A
                              onPermission
+ Add                         LambdaFunctionbucketEventya   AWS::Lambda::Permission       N/A
                              mlPermission
+ Add                         LambdaFunction                AWS::Lambda::Function         N/A
+ Add                         bucket                        AWS::S3::Bucket               N/A
+ Add                         deadQueue                     AWS::SQS::Queue               N/A
+ Add                         iamInstanceProfile            AWS::IAM::InstanceProfile     N/A
+ Add                         iamPolicies                   AWS::IAM::Policy              N/A
+ Add                         iamRole                       AWS::IAM::Role                N/A
+ Add                         snsTopic                      AWS::SNS::Topic               N/A
---------------------------------------------------------------------------------------------------------------------

```


The bucket name and the notification email are set as parameters

```
export candidate_name=fabio
export notification_email=test@test.com
```

## Running

A sample JSON / YAML file is included. To test the function, first copy the files to your bucket.

```
aws s3 cp data/test.json s3://${BUCKET_NAME}/
aws s3 cp data/test.yaml s3://${BUCKET_NAME}/
```

## CICD

```
on:
  push:
    branches:
      - main
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - uses: aws-actions/setup-sam@v1
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ##region##
      # sam build 
      - run: sam build --use-container

# Run Unit tests- Specify unit tests here 

# sam deploy
      - run: sam deploy --no-confirm-changeset --no-fail-on-empty-changeset --stack-name bucketname --s3-bucket ##s3-bucket## --capabilities CAPABILITY_IAM --region ##region##
```
