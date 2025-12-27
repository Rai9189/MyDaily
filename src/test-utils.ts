import { 
  hashPin, 
  verifyPin, 
  validatePinFormat,
  getPinStrength 
} from './utils/pinEncryption';

import {
  formatDate,
  getDaysUntil,
  calculateTaskStatus,
  getRelativeTime
} from './utils/dateHelpers';

async function testPinUtils() {
  console.log('=== Testing PIN Utilities ===');
  
  // Test hash PIN
  const pin = '1234';
  const hashed = await hashPin(pin);
  console.log('Hashed PIN:', hashed);
  
  // Test verify PIN
  const isValid = await verifyPin(pin, hashed);
  console.log('PIN Valid:', isValid);
  
  // Test validate format
  console.log('PIN 1234 valid?', validatePinFormat('1234', 'pin4'));
  console.log('PIN 123 valid?', validatePinFormat('123', 'pin4'));
  
  // Test password strength
  console.log('Password "123456" strength:', getPinStrength('123456'));
  console.log('Password "MyP@ssw0rd123" strength:', getPinStrength('MyP@ssw0rd123'));
}

function testDateUtils() {
  console.log('\n=== Testing Date Utilities ===');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);
  
  console.log('Today:', formatDate(today, 'long'));
  console.log('Days until tomorrow:', getDaysUntil(tomorrow));
  console.log('Relative time tomorrow:', getRelativeTime(tomorrow));
  console.log('Task status (5 days):', calculateTaskStatus(nextWeek));
}

// Run tests
testPinUtils();
testDateUtils();