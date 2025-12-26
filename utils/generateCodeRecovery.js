const generateSecurityCode = async (FacultyProfile) => {
  let code;
  let exists = true;

  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    exists = await FacultyProfile.exists({ securityCode: code });
  }

  return code;
};

module.exports = generateSecurityCode;
