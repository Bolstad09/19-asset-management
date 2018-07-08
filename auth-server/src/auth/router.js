'use strict';

import superagent from 'superagent';
import express from 'express';
const authRouter = express.Router();

import User from './model.js';
import auth from './middleware.js';

import modelFinder from '../middleware/models.js';
authRouter.param('model', modelFinder);

authRouter.post('/signup', (req, res, next) => {
  if(!Object.keys(req.body).length) {
    console.log('no body');
    next(400);
  }
  
  let user = new User(req.body);
  user.save()
    .then( user => res.send(user.generateToken()) )
    .catch(next);
});

authRouter.get('/signin',auth, (req, res) => {
  res.cookie('Token', req.token);
  res.send(req.token);
});

authRouter.get('/oauth/google/code', (req, res, next) => {

  let URL = process.env.CLIENT_URL;
  let code = req.query.code;

  console.log('(1) code', code);


  superagent.post('https://api.facebook.com/oauth/access_token')
    .type('form')
    .send({
      code: code,
      client_id: process.env.FACEBOOK_CLIENT_ID,
      client_secret: process.env.FACEBOOK_CLIENT_SECRET,
      redirect_uri: `${process.env.API_URL}/oauth`,
      grant_type: 'authorization_code',
    })
    .then( response => {
      let googleToken = response.body.access_token;
      console.log('(2) facebook token', googleToken);
      return googleToken;
    })

    .then ( token => {
      return superagent.get('https://developers.facebook.com/apps/1928723210473744/settings/advanced/')
        .set('Authorization', `Bearer ${token}`)
        .then (response => {
          let user = response.body;
          console.log('(3) facebook User', user);
          return user;
        });
    })
    .then(facebookUser => {
      console.log('(4) Creating Account');
      return User.createFromOAuth(facebookUser);
    })
    .then (user => {
      console.log('(5) Created User, generating token');
      return user.generateToken();
    })
    .then ( token => {
      res.cookie('Token', token);
      res.redirect(URL);
    })
    .catch( error => {
      console.log('ERROR', error.message);
      next(error);

    });

});

authRouter.get('/showMeTheMoney', auth, (req,res,next) => {
  res.send('Here is all the ca$h');
});

export default authRouter;