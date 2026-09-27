const bcrypt = require('bcryptjs');
console.log('hash:', bcrypt.hashSync('password', 10));
console.log('Admin@123 hash:', bcrypt.hashSync('Admin@123', 10));
console.log('Dealer@123 hash:', bcrypt.hashSync('Dealer@123', 10));
console.log('Customer@123 hash:', bcrypt.hashSync('Customer@123', 10));
