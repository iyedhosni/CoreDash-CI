const bcrypt = require('bcrypt');
const db = require('../models'); // Sequelize models folder

(async () => {
  const email = 'aze@aze.aze';
  const plainPassword = 'aze';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  try {
    // Check if the user already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      console.log('⚠️  User already exists');
      return;
    }

    // Create the user
    const newUser = await db.User.create({
      first_name: 'Admin',
      last_name: 'User',
      email,
      role: 'admin',
      password: hashedPassword // <-- change here
    });



    console.log(`✅ Admin user created: ${newUser.email} (id: ${newUser.id})`);
  } catch (err) {
    console.error('❌ Failed to create admin user:', err);
  } finally {
    process.exit();
  }
})();
