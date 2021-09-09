const stream = require('stream')
const readline = require('readline')

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// read S3 file by line
function createReadline(Bucket, Key) {

    // s3 read stream
    const input = S3
        .getObject({
            Bucket,
            Key
        })
        .createReadStream()

    // node readline with stream
    return readline
        .createInterface({
            input,
            terminal: false
        })
}

// write S3 file
function createWriteStream(Bucket, Key) {
    const writeStream = new stream.PassThrough()
    const uploadPromise = S3
        .upload({
            Bucket,
            Key,
            Body: writeStream
        })
        .promise()
    return { writeStream, uploadPromise }
}

function convertYaml(file) {
    // do something
    return file
}

function convertJson(file) {
    // do something
    return file
}

// event.inputBucket: source file bucket
// event.inputKey: source file key
// event.outputBucket: target file bucket
// event.outputKey: target file key
// event.limit: maximum number of lines to read

exports.lambdaS3Handler = async (event, context, callback) => {
    const getObjectRequests = event.Records.map(async (record) => {
        const params = {
            Bucket: record.s3.bucket.name,
            Key: record.s3.object.key,
        };

        const sns_params = {
            Message: 'This is a sample message',
            Subject: 'Test SNS From Lambda',
            TopicArn: process.env.SNS_ARN
          };

        const src_bucket    = event.Records[0].s3.bucket.name;        
        const src_key       = event.Records[0].s3.object.key;
        const key           = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        var totalLineCount  = 0

        const readStream = createReadline(event.inputBucket, event.inputKey)
        const { writeStream, uploadPromise } = createWriteStream(event.outputBucket, event.outputKey)

        var path = require('path')
        const type = path.extname(key)

        try {
            const { Body } = await s3.getObject(params).promise();
            console.log("File Name");
            console.log(key);
            console.log(src_key);
            console.log("File Info");
            console.log(Body.toString());


            // Tranforms + Count lines
            readStream.on('line', line => {
        
                if (event.limit && event.limit <= totalLineCount) {
                    return readStream.close()
                    console.log(src_key);
                    console.log("Line Count");
                    console.log(totalLineCount);                    
                }
                
                else {
                    // Transform File
                    if (type == '.yaml') {
                        line = convertYaml(key)
                        writeStream.write(`${line}\n`)
                    }
                    else if ( type == '.json') {
                        line = convertJson(key)
                        writeStream.write(`${line}\n`)
                    }
                    else {
                        const data = await sns.publish(sns_params).promise();
                    }
                }        
                totalLineCount++
            })


        } catch (error) {
            console.error('Error calling S3 getObject:', error);
            throw error;
        }
    });

    await Promise.all(getObjectRequests);
};