const { User } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// --- Helper function to fetch role distribution data ---
const fetchRoleDistributionData_Internal = async () => {
  try {
    return await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true // Get plain JSON objects
    });
  } catch (error) {
    console.error('Error fetching role distribution data internally:', error);
    return []; // Return empty array on error
  }
};

// The broadcastRoleUpdates function is removed as it's no longer needed for the active users chart.

// GET /api/users/count
exports.getUserCount = async (req, res) => {
  try {
    // Get current user count (non-admin users only)
    const totalUsers = await User.count({
      where: { role: { [Op.ne]: 'admin' } }
    });
    
    // For now, we'll just return the total users without the percentage change
    // to avoid the 500 error. We'll implement the percentage calculation later.
    res.json({ 
      totalUsers,
      percentageChange: 0 // Default to 0% change for now
    });
  } catch (err) {
    console.error('Error in getUserCount:', err);
    res.status(500).json({ 
      message: 'Failed to fetch user count',
      error: err.message 
    });
  }
};

// GET /api/users/count/admins
exports.getTotalAdminsCount = async (req, res) => {
  try {
    const totalAdmins = await User.count({
      where: { role: 'admin' } 
    });
    res.json({ totalAdmins });
  } catch (err) {
    console.error('Error in getTotalAdminsCount:', err);
    res.status(500).json({ 
      message: 'Failed to fetch admin count',
      error: err.message 
    });
  }
};

// GET /api/users/count/active
exports.getTotalActiveUsersCount = async (req, res) => {
  try {
    const totalActiveUsers = await User.count({
      where: { is_active: true } 
    });
    res.json({ totalActiveUsers });
  } catch (err) {
    console.error('Error in getTotalActiveUsersCount:', err);
    res.status(500).json({ 
      message: 'Failed to fetch active user count',
      error: err.message 
    });
  }
};

// GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: { [Op.ne]: 'admin' } },
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, role, password, is_active } = req.body;
    if (!first_name || !last_name || !email || !role || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      first_name,
      last_name,
      email,
      role,
      password: hashed,
      is_active: is_active !== undefined ? is_active : true,
    });

    res.status(201).json({ id: user.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user' });
  }
};

// PATCH /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, is_active } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ message: 'Email already exists' });
    }

    await user.update({ first_name, last_name, email, role, is_active });

    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// PATCH /api/users/:id/password
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashed = await bcrypt.hash(password, 10);
    await user.update({ password: hashed });
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update password' });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// GET /api/users/roles/distribution
exports.getUserRoleDistribution = async (req, res) => {
  try {
    const roleDistribution = await fetchRoleDistributionData_Internal();
    res.json(roleDistribution);
  } catch (err) {
    console.error('Error in getUserRoleDistribution endpoint:', err); // Differentiate log message
    res.status(500).json({
      message: 'Failed to fetch user role distribution',
      error: err.message
    });
  }
};