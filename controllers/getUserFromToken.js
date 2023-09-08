const { ObjectId } = require('mongodb');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

async function getUserFromToken(req) {
  try {
    // Retrieve the token from the X-Token header
    const token = req.headers['x-token'];
    if (!token) {
      return null;
    }

    // Check if the token exists in Redis, retrieve user ID
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return null;
    }

    // Convert userId to ObjectId
    const userIdObject = new ObjectId(userId);

    // Retrieve the user from your database using the user ID
    const user = await dbClient.db.collection('users').findOne({ _id: userIdObject });
    if (!user) {
      return null;
    }

    // Return the user object (email and id) as a JSON response with status code 200
    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Internal Server Error');
  }
}

module.exports = getUserFromToken;
