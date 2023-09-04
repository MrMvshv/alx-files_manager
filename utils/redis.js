const redis = require('redis');

class RedisClient {
  constructor() {
    // Create a Redis client and handle errors
    this.client = redis.createClient();

    this.client.on('error', (error) => {
      console.error(`Redis client error: ${error}`);
    });
  }

  isAlive() {
    // Check if the client is connected to Redis
    return this.client.connected;
  }

  async get(key) {
    // Get a value from Redis by key
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  async set(key, value, duration) {
    // Set a value in Redis with an optional expiration
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }

  async del(key) {
    // Delete a value from Redis by key
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
