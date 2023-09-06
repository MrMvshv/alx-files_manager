const { ObjectId } = require('mongodb');

async function getUserFromToken(req, res) {
  try {
    // Retrieve the token from the X-Token header
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the token exists in Redis, retrieve user ID
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Convert userId to ObjectId
    const userIdObject = new ObjectId(userId);

    // Retrieve the user from your database using the user ID
    const user = await dbClient.db.collection('users').findOne({ _id: userIdObject });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Return the user object (email and id) as a JSON response with status code 200
    return res.status(200).json({ email: user.email, id: user._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = getUserFromToken;
