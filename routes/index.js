const express = require('express');

const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();

// Define routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
// create user
router.post('/users', UsersController.postNew);
// authenticate basically
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

// post files
router.post('/files', FilesController.postUpload);
// GET /files/:id
router.get('/files/:id', FilesController.getShow);
// GET /files
router.get('/files', FilesController.getIndex);
// PUT /files/:id/publish
router.put('/files/:id/publish', FilesController.putPublish);
// PUT /files/:id/unpublish
router.put('/files/:id/unpublish', FilesController.putUnpublish);
// GET /files/:id/data
router.get('/files/:id/data', FilesController.getFile);

module.exports = router;
