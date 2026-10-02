const dns = require('dns');
const mongoose = require('mongoose');

// Node's DNS resolver (c-ares) is refused by many campus/ISP DNS servers.
// Public resolvers are required for mongodb+srv SRV lookups on this network.
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const connect = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(uri, { family: 4 });
    console.log(' Connected to MongoDB Atlas successfully');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connect;
