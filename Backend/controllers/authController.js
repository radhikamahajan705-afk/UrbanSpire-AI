const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new citizen
// @route   POST /api/auth/signup
// @access  Public
const signupCitizen = async (req, res, next) => {
  try {
    const { name, email, password, mobile, ward } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      mobile,
      ward: ward || '',
      role: 'citizen',
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Citizen account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        ward: user.ward,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login citizen
// @route   POST /api/auth/login
// @access  Public
const loginCitizen = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'citizen' }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        ward: user.ward,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login officer
// @route   POST /api/auth/officer-login
// @access  Public
const loginOfficer = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const { password } = req.body;

    const user = await User.findOne({ email, role: { $in: ['officer', 'admin', 'commissioner'] } })
      .select('+password')
      .populate('department', 'name');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This officer account has been deactivated' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Officer login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user's own profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('department', 'name');
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    List all officers (for the "Assign Officer" dropdown in the Municipality Dashboard)
// @route   GET /api/auth/officers
// @access  Private (officer, admin)
const getOfficers = async (req, res, next) => {
  try {
    const officers = await User.find({ role: 'officer', isActive: true })
      .select('name email designation department')
      .populate('department', 'name');
    res.status(200).json({ success: true, count: officers.length, officers });
  } catch (error) {
    next(error);
  }
};

module.exports = { signupCitizen, loginCitizen, loginOfficer, getMe, getOfficers };
