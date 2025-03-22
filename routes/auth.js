const express = require('express');
const { getDb } = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const router = express.Router();
const cookieParser = require('cookie-parser');

router.use(cookieParser());
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Verification',
     text: `Your OTP is: ${otp}`,
    });
  } catch (error) {
    console.log(error);
  }
};

const generateToken = (email) => jwt.sign({ email }, process.env.SECRET, { expiresIn: '1h' });

const sendOtp = async (email, res) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 60 * 60 * 1000; 

  res.cookie('otp', JSON.stringify({ otp, expiresAt }), {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 3600000, 
  });

  await sendOtpEmail(email, otp);
};

const compareOtp = (enteredOTP, otpCookie) => {
  if (!otpCookie) return false;
  const { otp, expiresAt } = JSON.parse(otpCookie);
  console.log(otp+"Comapre function !!!");
  if (Date.now() > expiresAt) {
    console.log('Expired OTP');
    return false;
  }
  if (String(otp) !== String(enteredOTP)) {
    console.log('OTP not matched');
    return false;
  }
  return true;
};

const checkUserCredentials = async (email, password) => {
  const account = getDb('accounts');
  const user = await account.findOne({ email });
  if (!user) return { error: 'User not found !!!' };
  
  const checkPassword = await bcrypt.compare(password, user.password);
  if (!checkPassword) return { error: 'Invalid Access !!!' };

  return { user };
};

router.post('/sign', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const account = getDb('accounts');
    const userExists = await account.findOne({ email });

    if (userExists) return res.status(400).json({ msg: 'User Already Exists !!!' });

    const hashPassword = await bcrypt.hash(password, 12);
    await account.insertOne({ email, password: hashPassword, name });

    await sendOtp(email, res);
    const token = generateToken(email);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000,
    });
    res.cookie('email', email, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000,
    });
    res.cookie('name', name, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000,
    });

    return res.status(200).json({ msg: 'User Registered Successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Internal Server Error !!!' });
  }
});

router.post('/log', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { error, user } = await checkUserCredentials(email, password);

    if (error) return res.status(400).json({ msg: error });

    await sendOtp(email, res);
    const token = generateToken(email);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000,
    });
    res.cookie('email', email, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000,
    });
    res.cookie('name', user.name, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600000,
    });

    return res.status(200).json({ msg: 'User Logged in Successfully !!!' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Internal Server Error !!!' });
  }
});

router.post('/verify-otp', (req, res) => {
  try {
    const { otp } = req.body;
    const otpCookie = req.cookies.otp;


      console.log(otpCookie+" otpCookie");
    if (!otp) return res.status(400).json({ msg: 'OTP is required !!!' });

    if (compareOtp(otp, otpCookie)) {
      return res.status(200).json({ msg: 'OTP verified successfully' });
    } else {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Internal Server Error !!!' });
  }
});

module.exports = router;
