const stream = require('stream')
const readline = require('readline')

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// read S3 file by line
function createReadline(Bucket, Key) {

    // s3 read stream
    const input = s3
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
    const uploadPromise = s3
        .upload({
            Bucket,
            Key,
            Body: writeStream
        })
        .promise()
    return { writeStream, uploadPromise }
}

function convertYaml(line) {
    // do something
    return line
}

function convertJson(line) {
    // do something
    return line
}

exports.lambdaS3Handler = async (event, context) => {
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
        //console.log(event) Ref. https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html

        const src_bucket    = event.Records[0].s3.bucket.name;        
        const src_key       = event.Records[0].s3.object.key;
        const key           = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        var totalLineCount  = 0
        var path = require('path')
        const type = path.parse(key).ext
        const filename = path.parse(key).name

        const readStream = createReadline(src_bucket, src_key)
        const { writeStream, uploadPromise } = createWriteStream(src_bucket, filename)

        try {
            const { Body } = await s3.getObject(params).promise();
            
            console.log("File Name");
            console.log(key);
            console.log(src_key);
            console.log(filename);
            console.log(type);
            console.log("File Info");
            console.log(Body.toString());

            // Tranforms + Count lines / begin stream
            readStream.on('line', line => {
        
                if (event.limit && event.limit <= totalLineCount) {
                    return readStream.close()
                    console.log("Line Count");
                    console.log(totalLineCount);                    
                }
                
                else {
                    // Transform File
                    if (type == '.yaml') {
                        console.log("YAML File Conversion");
                        line = convertYaml(key)
                        writeStream.write(`${line}\n`)
                    }
                    else if ( type == '.json') {
                        console.log("JSON File Conversion");
                        line = convertJson(key)
                        writeStream.write(`${line}\n`)
                    }
                    else {
                        console.log("Error sending SNS");
                        sns.publish(sns_params).promise();
                    }
                }        
                totalLineCount++
            })

            // end stream
            readStream.on('end', async () => {

                // end write stream
                writeStream.end()
            
                // wait for upload
                const uploadResponse = await uploadPromise
            
            })


        } catch (error) {
            console.error('Error calling S3 getObject:', error);
            throw error;
        }
    });

    await Promise.all(getObjectRequests);
};