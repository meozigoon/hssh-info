module.exports = (req, res) => {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
  };

  const responsePayload = {
    firebaseConfig,
    allowedDomain: process.env.ALLOWED_LOGIN_DOMAIN || 'hansung-sh.hs.kr',
    neisMealApiKey: process.env.NEIS_MEAL_API_KEY,
    neisEventApiKey: process.env.NEIS_EVENT_API_KEY,
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    return res.status(500).json({
      error: 'Firebase configuration is incomplete. Please check your environment variables.',
    });
  }

  return res.status(200).json(responsePayload);
};
