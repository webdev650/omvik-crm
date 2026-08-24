const axios = require('axios');

async function checkLiveRoute() {
  try {
    console.log('Testing GET https://omvik-crm-dy3u.onrender.com/api/admin/login-activity...');
    const res = await axios.get('https://omvik-crm-dy3u.onrender.com/api/admin/login-activity');
    console.log('Response Status:', res.status);
    console.log('Response Data:', res.data);
  } catch (err) {
    if (err.response) {
      console.log('HTTP Status:', err.response.status);
      console.log('HTTP Response Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

checkLiveRoute();
