const redis = require('redis');
const client = redis.createClient();

const key = 'testKey';
const value = 'testValue';
const expTime = 86400; // 24 hours

client.set(key, value, 'EX', expTime, (err, reply) => {
  if (err) {
    console.error('Redis error:', err);
  } else {
    console.log('Key set successfully:', reply);
  }

  // Close the Redis connection
  client.quit();
});

