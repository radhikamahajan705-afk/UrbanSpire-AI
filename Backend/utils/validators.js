const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile').matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const complaintValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('description').trim().notEmpty().withMessage('Complaint description is required'),
];

const certificateValidation = [
  body('type').notEmpty().withMessage('Document type is required'),
  body('applicantName').trim().notEmpty().withMessage('Applicant name is required'),
  body('idNumber').trim().notEmpty().withMessage('ID / reference number is required'),
  body('mobile').matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
];

const chatValidation = [
  body('message').trim().notEmpty().withMessage('Message cannot be empty'),
];

module.exports = {
  registerValidation,
  loginValidation,
  complaintValidation,
  certificateValidation,
  chatValidation,
};
