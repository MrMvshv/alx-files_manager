const sha1 = require('sha1');
const uuidv4 = require('uuid').v4;

const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(req, res) {
    // console.log("connecting user: ", req.headers);
    // get auth header
    const authHeader = req.headers.authorization;

    // unauthorized if above missing
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // console.log("Auth header: ", authHeader);
    // Extract the Base64-encoded email and password
    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');

    // console.log("encoded ", encodedCredentials);
    // console.log("decoded ", decodedCredentials);
    const [email, password] = decodedCredentials.split(':');

    // Find the user in database by email
    const user = await dbClient.db.collection('users').findOne({ email });
    // console.log("user ", user);
    // If user not found or password is incorrect, return Unauthorized
    if (!user || user.password !== sha1(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a random authentication token
    const token = uuidv4();
    // console.log("token: ", token);
    // Create a Redis key for the token and store user ID with a 24-hour expiration
    const redisKey = `auth_${token}`;
    const userId = user._id.toString();

    // console.log("user._id: ", userId);
    // 86400 seconds = 24 hours
    try {
      // Ensure that redisKey and user.id are defined before set
      if (redisKey && userId) {
        const expTime = 86400;
        // console.log("redisKey: ", redisKey);
        // console.log("userId: ", userId);
        // console.log("expTime: ", expTime);
        await redisClient.set(redisKey, userId, expTime);
        // console.log("Redis set operation completed.");
      } else {
        console.error('redisKey or user.id is undefined.');
      }
    } catch (error) {
      // Handle any errors during the set operation
      console.error('redis error:', error.message);
      // return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Respond with the generated token
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    try {
      // console.log("disconnecting... ", req);

      // retrieve token from request
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if token exists in Redis, retrieve user ID
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Delete the token from Redis to log the user out
      await redisClient.del(`auth_${token}`);

      // Return a success response with status code 204
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = AuthController;
