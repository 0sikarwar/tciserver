const express = require("express");
const config = require('./dbConnection')
const http = require('http');
const fs = require('fs');
const app = express()
const oracledb = require('oracledb');
const httpServer = http.createServer(app);

try {
  oracledb.initOracleClient({libDir: process.env.NODE_ENV === "production" ? "/opt/oracle/instantclient_21_1" : process.env['HOME']+'/instantclient'});
  oracledb.autoCommit = true;
} catch (err) {
  console.error('Whoops!');
  console.error(err);
  process.exit(1);
}
app.get("/ping", function (req, res) {
  runTest()
	return res.send("pong");
});
app.get("/", function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('TCI SERVER\n');
});
const PORT = process.env.PORT || 8080

 function runTest() {
  console.log("Connecting db...")
  var datetime = new Date();
  try {
    oracledb.getConnection(config, function(err, conn){
  console.log("Connected db")
      if(err){
        console.error(err);
      }
      else{
        conn.execute(
          `INSERT INTO ADMIN.CONTACT_US_TABLE (
            NAME,
            BNAME,
            EMAIL,
            PHONE,
            MSG
        ) VALUES (
            'sdfsrer',
            'dsfdsd',
            'EMAIL',
            'PHONE',
            '${datetime.toString()}'
        )`     
          // "select * from contact_us_table"
        ).then((result)=>{
          console.log(result);
        })
      }
    })
  } catch (err) {
    console.error(err);
  }
}

httpServer.listen(PORT, process.env.IP || "", () => {
  console.log("Node Env is: ", process.env.NODE_ENV || "dev")
    console.log(`App listening to ${process.env.IP || "localhost"}:${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})