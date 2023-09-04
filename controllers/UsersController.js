const sha1 = require('sha1');
const { MongoClient } = require('mongodb');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    /**
     * Create a new user.
     * @param {express.Request} req
     * @param {express.Response} res
     * @returns {Promise<void>}
     */
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      // Check if the email already exists in DB
      const userExists = await dbClient.db.collection('users').findOne({ email });

      if (userExists) {
        return res.status(400).json({ error: 'Already exists' });
      }

      // Hash the password using SHA1
      const hashedPassword = sha1(password);

      // Create a new user
      const newUser = {
        email,
        password: hashedPassword,
      };

      const result = await dbClient.db.collection('users').insertOne(newUser);

      // Return the newly created user with email and id
      return res.status(201).json({
        email: result.ops[0].email,
        id: result.ops[0]._id,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;
