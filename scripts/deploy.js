/* eslint no-console: 0 */
require('dotenv').config({
  silent: (process.env.NODE_ENV === 'production' || process.env.CI),
})

const path = require('path')
const s3 = require('s3')
const ora = require('ora')

const spinner = ora('Running deployment process').start()

const client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
  },
})

const uploader = client.uploadDir({
  localDir: path.join(__dirname, '../dist'),
  s3Params: {
    Bucket: process.env.AWS_BUCKET,
    Prefix: '',
  },
})

uploader.on('error', (error) => {
  spinner.fail()
  console.log(' ---- ')
  console.error(error)
})

uploader.on('progress', () => {
  spinner.text = `Deploying ${uploader.progressAmount} from ${uploader.progressTotal} bytes`
})

uploader.on('end', () => spinner.succeed())
