const TEMPLATES = {
  onTimeLogin: [
    "Good morning, {name}! Ready to close some deals today? ☀️",
    "Hey {name}, let's make today count! 💪",
    "Welcome back, {name}! Let's crush today's targets 🚀",
    "Great to see you on time, {name}! Time to turn leads into wins 🏆"
  ],
  lateLogin: [
    "Well well, look who decided to show up, {name} 😏",
    "Someone hit snooze today, {name}? Let's get moving! ⏰",
    "Fashionably late, {name}! Glad you made it, let me grab your coffee ☕",
    "Good to see you, {name}! Better late than never, right? 😄"
  ],
  lunchLogin: [
    "Back from lunch, {name}? Perfect timing 🍽️",
    "Hope lunch was great, {name}! Ready for the afternoon push? ⚡",
    "Refueled and ready, {name}? Let's check on your active deals 🚀"
  ],
  lateNightLogin: [
    "Burning the midnight oil, {name}? Don't overdo it! 🌙",
    "Night owl mode activated, {name}! Remember to rest up 🌌",
    "Late shift hustle, {name}? Make sure to take breaks ☕"
  ],
  logout: [
    "Great work today, {name}! See you tomorrow 👋",
    "Another day, another few deals closer, {name}! 🎉",
    "Unplug and relax, {name}! You've earned it today 🌟",
    "Call it a day, {name}! Rest up for another big day tomorrow 😴"
  ]
};

function determineLoginCategory(settings) {
  const now = new Date();
  const hour = now.getHours();

  const officeStartHour = settings?.workingHours?.start ? parseInt(settings.workingHours.start.split(':')[0], 10) : 9;

  if (hour < 5) return 'lateNightLogin';
  if (hour <= officeStartHour) return 'onTimeLogin';
  if (hour >= 13 && hour < 15) return 'lunchLogin';
  if (hour >= 21) return 'lateNightLogin';
  return 'lateLogin';
}

function getRandomMascotMessage(category, name) {
  const firstName = (name || 'Friend').trim().split(' ')[0];
  const list = TEMPLATES[category] || TEMPLATES.onTimeLogin;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex].replace('{name}', firstName);
}

module.exports = {
  TEMPLATES,
  determineLoginCategory,
  getRandomMascotMessage
};
