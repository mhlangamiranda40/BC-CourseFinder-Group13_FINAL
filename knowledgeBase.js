// This file contains all Belgium Campus-specific facts the bot will use to answer questions.
// It is structured as a plain JavaScript object so it is easy to expand later.
// The bot will search this knowledge base before sending a query to the AI engine,
// and inject any matching facts into the prompt so the AI answers accurately.

const knowledgeBase = {

  // General information about Belgium Campus
  about: `
    Belgium Campus iTversity (BC) is a private higher education institution in South Africa.
    It is registered with the Department of Higher Education and Training (DHET).
    It is accredited by the Council on Higher Education (CHE).
    It is located in Pretoria, Gauteng, South Africa.
    Belgium Campus specialises exclusively in Information Technology education.
    It was founded with the goal of producing work-ready IT graduates.
    The campus has strong ties with the South African IT industry.
  `,

  // Entry requirements for all programmes
  entryRequirements: `
    All applicants must have a National Senior Certificate (NSC) — this is your Matric certificate.
    
    For DEGREE programmes (BSc IT):
    - You need pure Mathematics (not Mathematical Literacy) at 50% or above.
    - You need English at 50% or above.
    - You need an APS (Admission Point Score) of at least 24.
    - Physical Science is recommended but not always compulsory.

    For DIPLOMA programmes:
    - You need pure Mathematics (not Mathematical Literacy) at 40% or above.
    - You need English at 40% or above.
    - You need an APS of at least 18.

    Mathematical Literacy is NOT accepted for any IT programme at Belgium Campus.
    If you have Mathematical Literacy instead of pure Maths, you do not qualify for entry.
    
    APS is calculated by converting your Matric subject percentages into points (1–7 scale).
    You add up the points from your six best subjects excluding Life Orientation.
  `,

  // Programmes offered at Belgium Campus
  programmes: `
    Belgium Campus offers the following IT programmes:

    1. Bachelor of Science in Information Technology (BSc IT) — 3 years
       - This is a full degree, not a diploma.
       - It covers software development, data science, networking, and cybersecurity.
       - Graduates can work as software developers, systems analysts, data scientists, and more.

    2. Diploma in Information Technology — 3 years
       - A practical, hands-on qualification.
       - Covers programming, networking, and IT support.
       - Good option if you want to enter the workforce sooner with a solid qualification.

    3. Higher Certificate in Information Technology — 1 year
       - A short programme for students who do not yet meet degree or diploma entry requirements.
       - After completing it successfully you can progress into the Diploma or BSc IT.
       - This is a good bridging option for students with lower APS scores.
  `,

  // Careers students can pursue after studying at Belgium Campus
  careers: `
    After studying IT at Belgium Campus you can pursue careers such as:

    Software Developer / Software Engineer
    - Builds applications, websites, and systems using programming languages.
    - Common languages: Java, Python, C#, JavaScript.
    - One of the most in-demand IT careers in South Africa and globally.

    Data Scientist / Data Analyst
    - Works with large amounts of data to find patterns and insights.
    - Uses tools like Python, R, SQL, and machine learning.
    - Requires strong mathematical and analytical thinking.

    Network Engineer / Network Administrator
    - Designs, sets up, and maintains computer networks.
    - Works with routers, switches, firewalls, and cloud infrastructure.
    - Relevant certifications include CompTIA Network+ and Cisco CCNA.

    Cybersecurity Analyst
    - Protects organisations from hackers and digital threats.
    - Monitors systems, investigates breaches, and implements security measures.
    - A fast-growing field in South Africa.

    IT Support Technician / Systems Administrator
    - Helps users with hardware and software problems.
    - Manages servers, user accounts, and IT infrastructure.
    - A good starting point for a career in IT.

    Database Administrator (DBA)
    - Designs and manages databases that store company data.
    - Works with SQL Server, Oracle, MySQL, and PostgreSQL.

    UI/UX Designer
    - Designs the look, feel, and usability of apps and websites.
    - Combines creative and technical skills.
  `,

  // Subject guidance for Matric students
  subjects: `
    Subjects that are important for studying IT at Belgium Campus:

    Mathematics (Pure Maths) — ESSENTIAL
    - Required for all IT programmes at Belgium Campus.
    - Mathematical Literacy is NOT accepted. You must take pure Maths.
    - Aim for at least 50% for degree entry or 40% for diploma entry.

    English — ESSENTIAL
    - All teaching and learning at Belgium Campus is in English.
    - You need at least 50% for degree entry or 40% for diploma entry.

    Physical Science — RECOMMENDED
    - Not always compulsory but it strengthens your application.
    - Helps with logical thinking and understanding how computers work.

    Information Technology (IT) as a Matric subject — HELPFUL
    - If your school offers IT as a subject, taking it gives you a head start.
    - You will already know basic programming concepts before you arrive at BC.

    Computer Applications Technology (CAT) — LESS RELEVANT
    - CAT teaches basic computer usage and is not the same as IT.
    - It does not replace the IT subject and is not required for entry.
  `,

  // Difference between a degree and a diploma
  qualifications: `
    Difference between a Degree and a Diploma at Belgium Campus:

    BSc IT Degree (3 years):
    - A higher-level qualification recognised internationally.
    - More theoretical with strong academic depth.
    - Higher entry requirements (APS 24, Maths 50%).
    - Opens doors to postgraduate study (Honours, Masters).
    - Often leads to higher starting salaries.

    Diploma in IT (3 years):
    - A nationally recognised qualification.
    - More practical and hands-on in focus.
    - Lower entry requirements (APS 18, Maths 40%).
    - Prepares you directly for the workplace.
    - Can be upgraded to a degree through further study.

    Higher Certificate (1 year):
    - The shortest qualification offered.
    - Acts as a bridge if you do not meet diploma or degree entry requirements.
    - After passing you can continue into the Diploma or BSc IT.

    Both the degree and diploma are recognised by South African employers.
    Choose based on your Matric results, career goals, and how long you want to study.
  `,

  // Contact and application information
  contact: `
    To apply to Belgium Campus or get more information:

    Website: www.belgiumcampus.ac.za
    Location: Pretoria, Gauteng, South Africa
    Applications are done online through the Belgium Campus website.
    
    For the most up-to-date fees, closing dates, and bursary information,
    always check the official Belgium Campus website directly,
    as these details change each academic year.
  `
};

// Function that searches the knowledge base for content relevant to the user's question.
// It checks if any keywords from the question match topics in the knowledge base.
// Returns a string of all relevant sections joined together, or an empty string if nothing matches.
function searchKnowledgeBase(userMessage) {
  const message = userMessage.toLowerCase();
  const relevantSections = [];

  // Keywords that trigger the about section
  if (message.includes("belgium campus") || message.includes("what is bc") || message.includes("about bc") || message.includes("who are you") || message.includes("tell me about")) {
    relevantSections.push(knowledgeBase.about);
  }

  // Keywords that trigger the entry requirements section
  if (message.includes("requirement") || message.includes("aps") || message.includes("entry") || message.includes("qualify") || message.includes("admission") || message.includes("apply") || message.includes("get in") || message.includes("marks needed")) {
    relevantSections.push(knowledgeBase.entryRequirements);
  }

  // Keywords that trigger the programmes section
  if (message.includes("programme") || message.includes("program") || message.includes("course") || message.includes("bsc") || message.includes("degree") || message.includes("diploma") || message.includes("certificate") || message.includes("study") || message.includes("offer")) {
    relevantSections.push(knowledgeBase.programmes);
  }

  // Keywords that trigger the careers section
  if (message.includes("career") || message.includes("job") || message.includes("work") || message.includes("developer") || message.includes("data scientist") || message.includes("network") || message.includes("cybersecurity") || message.includes("after i graduate") || message.includes("what can i do")) {
    relevantSections.push(knowledgeBase.careers);
  }

  // Keywords that trigger the subjects section
  if (message.includes("subject") || message.includes("maths") || message.includes("mathematics") || message.includes("math literacy") || message.includes("physical science") || message.includes("english") || message.includes("cat") || message.includes("matric subject")) {
    relevantSections.push(knowledgeBase.subjects);
  }

  // Keywords that trigger the qualifications comparison section
  if (message.includes("difference") || message.includes("degree vs") || message.includes("diploma vs") || message.includes("which is better") || message.includes("qualification") || message.includes("certificate vs") || message.includes("higher certificate")) {
    relevantSections.push(knowledgeBase.qualifications);
  }

  // Keywords that trigger the contact section
  if (message.includes("contact") || message.includes("website") || message.includes("apply") || message.includes("application") || message.includes("fees") || message.includes("fee") || message.includes("bursary") || message.includes("how do i register")) {
    relevantSections.push(knowledgeBase.contact);
  }

  // Join all matched sections into one string and return it
  return relevantSections.join("\n\n");
}

// Export both the knowledge base object and the search function so server.js can use them
export { knowledgeBase, searchKnowledgeBase };