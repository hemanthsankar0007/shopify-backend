const mongoose = require("mongoose");

/**
 * connectDatabase
 * - Reads the MongoDB connection string from process.env.DB_LOCAL_URI
 * - Establishes a Mongoose connection with sensible options for Atlas / replica sets
 * - Logs the connected host and database name on success
 * - Exits the process on fatal connection errors
 */
const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_LOCAL_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Ensure we read from primary to get the latest document state
      readPreference: "primary",
      // Retry certain write operations automatically
      retryWrites: true,
      // Acknowledge write when majority of nodes persisted it
      w: "majority",
      // Fail fast if the driver cannot select a server
      serverSelectionTimeoutMS: 5000,
      // How often the driver checks server availability
      heartbeatFrequencyMS: 10000,
    })
    .then((con) => {
      // con.connection.host contains the host string of primary node
      console.log(
        `MongoDB Replica Set is connected to: ${con.connection.host}`
      );
      console.log(`Database: ${con.connection.db.databaseName}`);
    })
    .catch((error) => {
      // Log and terminate application if DB connection can't be established
      console.error("MongoDB connection error:", error);
      process.exit(1);
    });
};

module.exports = connectDatabase;
