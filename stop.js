import { google } from 'googleapis';
import AWS from 'aws-sdk';
let OAuth2 = google.auth.OAuth2;

let oauth2Client = new OAuth2(
  process.env.CLIENT_ID, // CLIENT_ID
  process.env.CLIENT_SECRET, // CLIENT_SECRET
);

export const handler = async (event, context) => {
  console.log("EVENT", event);

  let broadcastId = '7I5HVzk_JyQ'
  console.log(broadcastId);

  await streamStop(broadcastId);

  return ({ HTTP_CODE: 200 });
}

async function streamStop(broadcastId) {
  console.log(broadcastId);
  let errflag = 1;

  while (errflag == 1) {
    await oauth2Client.setCredentials({
      access_token: process.env.access_token,   // you get these after authorization of the client.
      refresh_token: process.env.refresh_token  // you only get it the first time of the authentication
    });

    await oauth2Client.refreshAccessToken((err, tokens) => {
      if (err) {
        console.error('Error refreshing access token:', err);
        errflag = 1;
        return;
      }
      console.log('Tokens:', tokens);
      oauth2Client.setCredentials(tokens);
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    try {
      let status = await youtube.liveBroadcasts.list({
        part: 'snippet,status,contentDetails',
        id: broadcastId,
      });

      console.log('Status:', status);

      if (status.data.items[0].status.lifeCycleStatus === 'live') {
        await youtube.liveBroadcasts.transition({
          id: broadcastId,
          broadcastStatus: 'complete',
          part: 'id'
        });
        console.log('Livestream is currently live!');
      } else {
        console.log('Livestream is not currently live.');
      }

      // Extract streamId from contentDetails
      let streamId = status.data.items[0].contentDetails.boundStreamId;

      // Delete the stream key
      await youtube.liveStreams.delete({
        id: streamId
      });
      console.log('Stream key deleted successfully');

      errflag = 0;
    } catch (e) {
      console.log("Error while transitioning or deleting stream key:", e);
      errflag = 1;
      await new Promise(r => setTimeout(r, 5000)); // wait for 5 seconds before retrying
    }
  }
}
