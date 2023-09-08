const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const getUserFromToken = require('./getUserFromToken');

let { FOLDER_PATH } = process.env; // Use FOLDER_PATH environment variable for storing files

class FilesController {
  static async postUpload(req, res) {
    // Call getUserFromToken to retrieve the user

    try {
      const user = await getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const {
        name, type, parentId = 0, isPublic = false, data,
      } = req.body;

      // Check if the user is authorized
      const userId = user._id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check for required fields
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Check parentId and validate it
      if (parentId !== 0) {
        const parentFile = await dbClient.db.collection('files').findOne({
          _id: ObjectId(parentId),
        });

        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Handle file data if type is file or image
      let localPath;
      if (type === 'file' || type === 'image') {
        if (!FOLDER_PATH) {
          // If FOLDER_PATH environment variable is not set, use the default path
          FOLDER_PATH = '/tmp/files_manager';
        }

        // Create the directory if it doesn't exist
        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH, { recursive: true });
        }

        // Generate a unique filename
        const fileName = `${uuidv4()}`;
        localPath = path.join(FOLDER_PATH, fileName);

        // Write the file to disk
        fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
      }

      // Create a new file document in the database
      const newFile = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId,
        localPath,
      };
      if (!newFile.parentId) {
        newFile.parentId = 0;
      }

      const result = await dbClient.db.collection('files').insertOne(newFile);

      const fmtResult = {
        id: result.ops[0]._id,
        userId: result.ops[0].userId,
        name: result.ops[0].name,
        type: result.ops[0].type,
        isPublic: result.ops[0].isPublic,
        parentId: result.ops[0].parentId,
      };
      return res.status(201).json(fmtResult);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getShow(req, res) {
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

      // Convert the ID parameter to ObjectId
      const fileId = req.params.id;
      const fileIdObject = new ObjectId(fileId);

      // Retrieve the user based on the token
      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check the file document exists and is linked to the user and the ID passed as a parameter
      const file = await dbClient.db.collection('files').findOne({ _id: fileIdObject, userId: user._id });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Return the file document
      return res.status(200).json(file);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
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

      // Convert the parentId query parameter to ObjectId
      const parentId = req.query.parentId || '0';
      let parentIdObject = '0'; // Default value if parentId is not provided

      if (ObjectId.isValid(parentId)) {
        parentIdObject = new ObjectId(parentId);
      }

      // Retrieve the user based on the token
      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Query for file documents matching the user and parentId, with pagination
      // Check if page query parameter is undefined and set the default to 0
      const page = req.query.page === undefined ? 0 : parseInt(req.query.page, 10);
      const pageSize = 20;
      const skip = page * pageSize;

      const files = await dbClient.db.collection('files')
        .find({ userId: user._id, parentId: parentIdObject })
        .skip(skip)
        .limit(pageSize)
        .toArray();

      // Return the list of file documents
      return res.status(200).json(files);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
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

      // Convert the ID parameter to ObjectId
      const fileId = req.params.id;
      const fileIdObject = new ObjectId(fileId);

      // Retrieve the user based on the token
      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if file document exists and is linked to the user and the ID passed as a parameter
      const file = await dbClient.db.collection('files').findOne({ _id: fileIdObject, userId: user._id });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Update the value of isPublic to true
      await dbClient.db.collection('files').updateOne({ _id: fileIdObject }, { $set: { isPublic: true } });

      // Return the updated file document
      return res.status(200).json({ ...file, isPublic: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(req, res) {
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

      // Convert the ID parameter to ObjectId
      const fileId = req.params.id;
      const fileIdObject = new ObjectId(fileId);

      // Retrieve the user based on the token
      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if file document exists and is linked to the user and the ID passed as a parameter
      const file = await dbClient.db.collection('files').findOne({ _id: fileIdObject, userId: user._id });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Update the value of isPublic to false
      await dbClient.db.collection('files').updateOne({ _id: fileIdObject }, { $set: { isPublic: false } });

      // Return the updated file document
      return res.status(200).json({ ...file, isPublic: false });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = FilesController;
