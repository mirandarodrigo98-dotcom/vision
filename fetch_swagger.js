const fs = require('fs');
const https = require('https');

const url = 'https://synhomologacao.questor.com.br/swagger/v2/swagger.json';
const file = fs.createWriteStream("questor_swagger.json");

https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(() => {
        console.log("Download completed.");
    });
  });
}).on('error', function(err) {
  fs.unlink("questor_swagger.json");
  console.error("Error downloading:", err.message);
});
