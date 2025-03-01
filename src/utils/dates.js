// Calculate due dates in Italy timezone
function calculateDueDateItaly(startDate, intervalDays) {
  const date = new Date(startDate);
  date.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
  date.setDate(date.getDate() + intervalDays);
  
  // Convert to Italy timezone (UTC+1)
  return new Date(date.toLocaleString('en-US', {
    timeZone: 'Europe/Rome'
  }));
}

// Get days remaining between two dates
function getDaysRemaining(dueDate) {
  const now = new Date();
  const timeDiff = dueDate - now;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

module.exports = {
  calculateDueDateItaly,
  getDaysRemaining
};
