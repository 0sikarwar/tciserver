const common = require("oci-common");
const database = require("oci-database");

const configFilePath = "~/.oci/config";
const config = new common.ConfigFileAuthenticationDetailsProvider(configFilePath, "DEFAULT");
const databaseClient = new database.DatabaseClient({ authenticationDetailsProvider: config });
const autonomousDatabaseId =
  "ocid1.autonomousdatabase.oc1.ap-mumbai-1.abrg6ljruthnmr77b7o5iuqva3bfjinjfnwphtycbdcskhzjgdry3kpn675a";
const request = {
  autonomousDatabaseId: autonomousDatabaseId,
};

module.exports.cronForDb = function () {
  setInterval(() => {
    startDb();
  }, 5 * 24 * 60 * 60 * 1000);
};

module.exports.startDb = function () {
  console.log(`startDb called at ${new Date().toLocaleString("en-IN")}`);

  databaseClient
    .getAutonomousDatabase(request)
    .then((response) => {
      console.log("Autonomous Database lifecycleState", response.autonomousDatabase.lifecycleState);
      if (response.autonomousDatabase.lifecycleState === "STOPPED") {
        databaseClient
          .startAutonomousDatabase(request)
          .then(() => {
            console.log("Autonomous Database is starting...");
          })
          .catch((err) => {
            console.error("Error starting Autonomous Database:", err);
          });
      }
    })
    .catch((err) => {
      console.error("Error getting Autonomous Database:", err);
    });
};
