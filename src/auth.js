export const auth0Client = await auth0.createAuth0Client({
  domain: "cms-editor.us.auth0.com",
  clientId: "KL8nUmcNI8Y5mTLQVtftv9hXslWDwWED",
  redirectUri: window.location.origin
});
