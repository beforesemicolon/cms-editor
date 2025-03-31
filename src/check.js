const {goToPage} = BFS.ROUTER;
import {auth0Client} from './auth.js';

(async () => {
  if (!await auth0Client.isAuthenticated()) {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: location.origin + '/editor'
      }
    });
  }
  
  goToPage('/editor')
})()

export default 'Loading...'
