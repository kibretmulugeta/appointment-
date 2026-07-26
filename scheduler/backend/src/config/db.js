const mongoose = require('mongoose');
const { Resolver } = require('dns').promises;

let isConnected = false;

const resolveAtlasSrv = async (hostname) => {
  try {
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${hostname}`);
    if (srvRecords && srvRecords.length > 0) {
      return srvRecords.map(r => `${r.name}:${r.port}`).join(',');
    }
  } catch (err) {
    console.warn('Google DNS SRV resolution warning:', err.message);
  }
  return null;
};

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  let mongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';

  if (!mongoUri) {
    console.error('MONGO_URI is not defined in environment variables');
    return;
  }

  if (mongoUri && !mongoUri.includes('authSource=')) {
    mongoUri += mongoUri.includes('?') ? '&authSource=admin' : '?authSource=admin';
  }

  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    isConnected = !!conn.connections[0].readyState;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Primary Mongo connection failed (${error.message}). Resolving Atlas SRV via custom Google DNS...`);

    if (mongoUri.startsWith('mongodb+srv://')) {
      try {
        const urlObj = new URL(mongoUri.replace('mongodb+srv://', 'http://'));
        const hostname = urlObj.hostname;
        const dbName = urlObj.pathname || '/scheduler';
        const auth = urlObj.username ? `${urlObj.username}:${urlObj.password}@` : '';
        const search = urlObj.search || '?retryWrites=true&w=majority&authSource=admin';

        const resolvedHosts = await resolveAtlasSrv(hostname);
        const hostsToUse = resolvedHosts || (
          hostname.split('.').length > 1
            ? `${hostname.split('.')[0]}-shard-00-00.${hostname.split('.').slice(1).join('.')}:27017,${hostname.split('.')[0]}-shard-00-01.${hostname.split('.').slice(1).join('.')}:27017,${hostname.split('.')[0]}-shard-00-02.${hostname.split('.').slice(1).join('.')}:27017`
            : hostname
        );

        const fallbackUri = `mongodb://${auth}${hostsToUse}${dbName}${search}${search.includes('?') ? '&' : '?'}ssl=true`;
        const conn = await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 8000 });
        isConnected = !!conn.connections[0].readyState;
        console.log(`✅ MongoDB Atlas Direct Connected: ${conn.connection.host}`);
        return;
      } catch (fallbackErr) {
        console.error('MongoDB Atlas Connection Error:', fallbackErr.message);
      }
    }
    console.error(`MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
