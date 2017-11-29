'use strict';

/* eslint no-console: 0 */
require('dotenv').config({
  silent: process.env.NODE_ENV === 'production' || process.env.CI
});

var path = require('path');
var s3 = require('s3');
var ora = require('ora');

var spinner = ora('Running deployment process').start();

var client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
  }
});

var uploader = client.uploadDir({
  localDir: path.join(__dirname, '../dist'),
  s3Params: {
    Bucket: process.env.AWS_BUCKET,
    Prefix: ''
  }
});

uploader.on('error', function (error) {
  spinner.fail();
  console.log(' ---- ');
  console.error(error);
});

uploader.on('progress', function () {
  spinner.text = 'Deploying ' + uploader.progressAmount + ' from ' + uploader.progressTotal + ' bytes';
});

uploader.on('end', function () {
  return spinner.succeed();
});