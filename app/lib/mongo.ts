import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);

export const getMongoClient = async () => {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
};

export const getMongoDb = async (dbName = "medicare") => {
  const connectedClient = await getMongoClient();
  return connectedClient.db(dbName);
};

