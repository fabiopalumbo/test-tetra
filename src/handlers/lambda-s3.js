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

// perform count on line
function processLine(line) {
    // do something
    return line
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

        const src_bucket    = event.Records[0].s3.bucket.name;        
        const src_key       = event.Records[0].s3.object.key;
        const key           = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        var totalLineCount  = 0

        const readStream = createReadline(event.inputBucket, event.inputKey)
        const { writeStream, uploadPromise } = createWriteStream(event.outputBucket, event.outputKey)


        try {
            const { Body } = await s3.getObject(params).promise();
            console.log("File Name");
            console.log(key);
            console.log("File Info");
            console.log(Body.toString());

            readStream.on('line', line => {
        
                if (event.limit && event.limit <= totalLineCount) {
                    return readStream.close()
                }
                
                else {
                    line = processLine(line)
                    writeStream.write(`${line}\n`)
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