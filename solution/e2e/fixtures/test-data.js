const primaryUser = {
  username: "e2e_primary",
  password: "E2e-password-123!"
};

const secondaryUser = {
  username: "e2e_secondary",
  password: "E2e-password-456!"
};

const testData = {
  weakPasswords: ["1", "123"],
  strongPassword: "Strong-Test-Password-123!",
  expectedMessages: {
    missingAuth: "Missing basic auth credentials",
    loginSuccess: "Login successful.",
    signInRequired: "Sign in required to use this section",
    questionnaireCreated: "Questionnaire created.",
    responsesSubmitted: "Responses submitted."
  },
  questionnaire: {
    textType: "text",
    numberType: "number",
    ownershipPrompt: "Describe encryption",
    changedPrompt: "Changed",
    stolenTitle: "Stolen questionnaire",
    passwordPrompt: "What is the minimum password length?",
    passwordShortPrompt: "Password length?",
    passwordOriginalPrompt: "What is the password length?",
    minimumLengthPrompt: "Minimum password length",
    algorithmPrompt: "Approved algorithm",
    algorithmRegex: "^(Argon2|bcrypt)$",
    validNumber: "12",
    invalidNumberText: "twelve",
    validAlgorithm: "Argon2",
    invalidAlgorithm: "MD5",
    invalidNumbers: ["-12", "12.555555555555555555555555555555555555555555"],
    invalidPrompts: ["", null],
    whitespacePrompt: "   "
  },
  evidence: {
    textFixtures: [
      { fileName: "erp-security-implementation.txt", uploadPrefix: "erp-security" },
      { fileName: "iot-fleet-security-design.txt", uploadPrefix: "iot-fleet-security" },
      { fileName: "hr-portal-controls.txt", uploadPrefix: "hr-portal-controls" }
    ],
    textMimeType: "text/plain",
    pdfMimeType: "application/pdf",
    binaryMimeType: "application/octet-stream",
    minimumScore: 0.35,
    maximumQueryChars: 600,
    compliancePhrase: "All non-employees must be pre-registered, escorted by a staff member at all times, and sign a digital non-disclosure agreement upon arrival.",
    complianceSnippet: "All non-employees must be pre-registered",
    privateTextSuffix: "uses Argon2id for password hashing.",
    deletionTextSuffix: "This unique control requires synchronized evidence deletion across every storage system.",
    unsupportedContent: "unsupported manual test content"
  },
  verificationAge: "30 days",
  names: {
    invalidPrompt: "invalid-prompt",
    textEvidence: "TXT evidence retrieval",
    compliancePdf: "International compliance PDF",
    deletionMarker: "DELETION-SYNC",
    deletionQuestionnaire: "Deleted evidence consistency",
    ownership: "ownership",
    duplicate: "duplicate",
    validation: "validation",
    numericBoundaries: "numeric-boundaries",
    blankPrompt: "blank-prompt",
    isolation: "isolation",
    uiQuestionnaire: "UI security questionnaire",
    reselectQuestionnaire: "Reselect questionnaire",
    responseHistory: "response-history",
    privateEvidence: "private-evidence",
    privateMarker: "PRIVATE-TENANT-SECRET",
    unsupportedUpload: "unsupported",
    expiredUser: "expired_token"
  }
};

function basicAuth(user) {
  return `Basic ${Buffer.from(`${user.username}:${user.password}`).toString("base64")}`;
}

function uniqueTitle(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

module.exports = { primaryUser, secondaryUser, testData, basicAuth, uniqueTitle };
