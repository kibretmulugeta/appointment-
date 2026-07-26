const mongoose = require('mongoose');
const dns = require('dns');

// Set default DNS servers to Google Public DNS to prevent local DNS SRV resolution issues
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if unable to override DNS in restricted environment
}

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = !!conn.connections[0].readyState;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
