'use strict';
const fs = require('fs')
const dataset = require("./downloadDataset")
const unzipper = require('unzipper')
const { Client } = require('@elastic/elasticsearch')
const lineReader = require('line-reader');
const constants = require('./constants')

// ESClient initialisation
const esClient = new Client({ node: constants.ES_HOST })

module.exports.indexData = (event, context) => {
  var timeStart = new Date().getTime()
  const promise = dataset.download()
  promise.then(() => {

    const time = new Date();
    console.log(`Cron function "${context.functionName}" ran at ${time}`);

    // unzip the file
    unzip()

    var chain = Promise.resolve();
    // parsing the file line by line
    lineReader.eachLine(constants.FILE_PATH, function(line, last) {
      console.log(`Reading line: `, line)
      let lineArr = line.split('\t')
      let [,postalCode, placeName, state,,,,,,lat, long] = lineArr
      let bodyObject = getBodyObject(postalCode, placeName, state, lat, long)
      // Indexing data to ES
      chain = chain.then( _ => indexES(bodyObject))
    });
    
    chain.then(()=>{
      var timeEnd = new Date().getTime()
      console.log('Execution time: ' + (timeEnd-timeStart))
      console.log(`indexing done`)
    })

  })
};

function unzip(){
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
  });
}

function indexES(bodyObject){
  return new Promise(function(resolve, reject){
    console.log(`Indexing Data: `, bodyObject)
    esClient.update( getRequestObject(bodyObject), (err, result) => {
      if(err) console.log(`error updating index: `, [bodyObject.place, JSON.stringify(err, null, 4)])
      resolve()
    })
  })
}

function getRequestObject(bodyObject){
  return {
    "id": getESIndex(bodyObject.place),
    "index": constants.ES_INDEX,
    "refresh": "true",
    "body": {
      "doc": bodyObject,
      "doc_as_upsert" : true
    }
  }
}

function getESIndex(str){
  return str
        .toLowerCase()
        .replace(/^\s+|\s+$/g, "") // trimming any spaces
        .replace(/[^A-Za-z0-9 -&,./]/g, "") // removing unsupported characters
        .replace(/\s+/g, "-") // collapsing dashes
        .replace(/ /g,"_") // replace spaces in between with _
        .replace(/^-+/, "") // trim - from start of text
        .replace(/-+$/, "") // trim - from end of text
}

function getBodyObject(postalCode, placeName, state, lat, long){
  return { postalCode, place: placeName, state, lat, long }
}