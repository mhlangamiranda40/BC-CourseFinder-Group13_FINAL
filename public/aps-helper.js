/**
 * APS Calculator Helper Functions
 * ================================
 * 
 * This module provides utility functions for working with student APS profiles
 * stored in the browser's localStorage. Use these functions to retrieve and
 * manage student APS data for personalized chatbot interactions.
 * 
 * Usage:
 *   const profile = getStudentAPSProfile();
 *   if (profile) {
 *     console.log(`Student APS: ${profile.apsScore}`);
 *     console.log(`Eligible courses: ${profile.eligibleCourses}`);
 *   }
 */

/**
 * Retrieve the student's APS profile from localStorage
 * @returns {Object|null} Parsed APS profile object or null if not found
 * 
 * Returns object structure:
 * {
 *   apsScore: number,        // Total APS points (0-42)
 *   english: number,         // English percentage (0-100)
 *   mathematics: number,     // Mathematics percentage (0-100)
 *   endorsement: string,     // "Higher Certificate", "Diploma", or "Bachelor"
 *   eligibleCourses: [       // Array of eligible programs at Belgium Campus
 *     {
 *       course: string,      // Course name
 *       status: string,      // "eligible" or "ineligible"
 *       reason: string       // Why eligible/ineligible
 *     }
 *   ],
 *   timestamp: string        // ISO 8601 timestamp when profile was created
 * }
 */
function getStudentAPSProfile() {
  const profile = localStorage.getItem('studentAPSProfile');
  return profile ? JSON.parse(profile) : null;
}

/**
 * Check if student is eligible for a specific Belgium Campus program
 * @param {string} courseName - Name of the course to check
 * @returns {Object|null} Eligibility info or null if no profile
 */
function checkProgramEligibility(courseName) {
  const profile = getStudentAPSProfile();
  if (!profile) return null;
  
  return profile.eligibleCourses.find(course => 
    course.course.toLowerCase().includes(courseName.toLowerCase())
  ) || null;
}

/**
 * Get a personalized message based on student's APS profile
 * @returns {string} Personalized guidance message
 */
function getPersonalizedGuidance() {
  const profile = getStudentAPSProfile();
  if (!profile) {
    return "Use the \"My APS\" calculator on the home page to see which Belgium Campus programs you qualify for.";
  }

  const { apsScore, mathematics, endorsement, eligibleCourses } = profile;
  const dipInIT = eligibleCourses.find(c => c.course.includes('Diploma in IT'));
  const bachIT = eligibleCourses.find(c => c.course.includes('Bachelor of IT') && !c.course.includes('Computing'));
  const bachComp = eligibleCourses.find(c => c.course.includes('Bachelor of Computing'));

  let message = `Based on your profile (APS: ${apsScore}, Endorsement: ${endorsement}):\n\n`;

  if (bachComp && bachComp.status === 'eligible' && mathematics >= 70) {
    message += `🌟 You're a **strong candidate** for the Bachelor of Computing with your ${mathematics}% in Mathematics!\n\n`;
  } else if (bachIT && bachIT.status === 'eligible') {
    message += `✓ You qualify for the Bachelor of IT. Strong choice for an IT career!\n\n`;
  } else if (dipInIT && dipInIT.status === 'eligible') {
    message += `✓ The Diploma in IT is an excellent starting point for your IT journey.\n\n`;
  }

  if (mathematics < 50) {
    message += `💡 **Note:** Your Mathematics is below 50%. You may want to explore the Mathematics Bridging Course at Belgium Campus to prepare for Bachelor programs.\n\n`;
  }

  message += `Always verify the latest requirements on the [Belgium Campus website](https://www.belgiumcampus.ac.za).`;
  
  return message;
}

/**
 * Clear the APS profile (for testing or user request)
 */
function clearAPSProfile() {
  localStorage.removeItem('studentAPSProfile');
}

/**
 * Export functions (if using modules)
 * Uncomment if this file is imported as a module
 */
// export { getStudentAPSProfile, checkProgramEligibility, getPersonalizedGuidance, clearAPSProfile };
