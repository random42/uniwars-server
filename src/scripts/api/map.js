const fs = require('fs')
const API = require('./api')

function toClientRequest() {
  let data = API.HTTP
  for (let route in data) {
    for (let req in data[route]) {
      delete data[route][req].title;
      delete data[route][req].description;
      delete data[route][req].response;
      delete data[route][req].data;
      delete data[route][req].params;
    }
  }
  const json = JSON.stringify(data, null, '\t')
  fs.writeFileSync('../gen_data/client_api.json', json);
}


toClientRequest();
