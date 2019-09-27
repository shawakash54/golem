'use strict';
const fs = require('fs')
const dataset = require("./downloadDataset")
const unzipper = require('unzipper')
const { Client } = require('es6')
const lineReader = require('line-reader')
const constants = require('./constants')
const md5 = require('md5')

// ESClient initialisation
const esClient = new Client({ 
    node: constants.ES_HOST,
    maxRetries: 5,
  })
esClient.info(console.log)

module.exports.indexData = (event, context) => {
  var timeStart = new Date().getTime()
  const promise = dataset.download()
  promise.then(() => {

    const time = new Date();
    console.log(`Cron function "${context.functionName}" ran at ${time}`);

    // unzip the file
    const unzipPromise = unzip()
    unzipPromise.then(() => {
      console.log(`unzipping completed`)
      var chain = Promise.resolve();
      var count = 1;
      // parsing the file line by line
      lineReader.eachLine(constants.FILE_PATH, function(line, last) {
        console.log(`Reading line: `, [count++, line])
        let lineArr = line.split('\t')
        let [,postalCode, placeName, state,,,,,,lat, long] = lineArr
        let bodyObject = getBodyObject(postalCode, placeName, state, lat, long)
        //Indexing data to ES
        chain = chain.then( _ => indexES(bodyObject))
      });
    })
  })
};

function unzip(){
  return new Promise(function(resolve, reject){
    fs.createReadStream(constants.ZIP_DOWNLOAD_PATH)
      .pipe(unzipper.Parse())
      .on('entry', function (entry) {
        const fileName = entry.path;
        const type = entry.type;
        const size = entry.vars.uncompressedSize;
        if (fileName === constants.FILE_NAME) {
          entry.pipe(fs.createWriteStream(constants.FILE_PATH));
        } else {
          entry.autodrain();
        }
      })
      .promise()
      .then(() => {
        resolve()
      });
  })
}

function indexES(bodyObject){
  return new Promise(function(resolve, reject){
    console.log(`Indexing Data: `, bodyObject)
    esClient.update( getRequestObject(bodyObject), (err, result) => {
      if(err) {
        console.log(`error updating index: `, [bodyObject.place, JSON.stringify(err, null, 4), err])
      }
      else {
        console.log(`Data indexed: `, [bodyObject.place, result])
      }
      resolve()
    })
  })
}

function getRequestObject(bodyObject){
  return {
    "id": getESIndex(bodyObject.place, bodyObject.postalCode, bodyObject.state),
    "index": constants.ES_INDEX,
    "refresh": "true",
    "type": "_doc",
    "body": {
      "doc": bodyObject,
      "doc_as_upsert" : true
    },
    "retry_on_conflict": 5
  }
}

function getESIndex(place, postalCode, state){
  let esindex = place
        .toLowerCase()
        .replace(/^\s+|\s+$/g, "") // trimming any spaces
        .replace(/\s+/g, "-") // collapsing dashes
        .replace(/ /g,"_") // replace spaces in between with _
        .replace(/^-+/, "") // trim - from start of text
        .replace(/-+$/, "") // trim - from end of text
  esindex += postalCode + state
  return md5(esindex)
}

function getBodyObject(postalCode, placeName, state, lat, long){
  return { postalCode, place: placeName, state, lat, long }
}