import { google } from 'googleapis';
import AWS from 'aws-sdk';

export const handler = async (event, context) => {
    try {
        // Hardcoded values for the live stream
        const requestBody = {
            title: "Final",
            startTime: "2024-06-21T10:00:00Z"
        };

        const OAuth2 = google.auth.OAuth2;
        const oauth2Client = new OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET
        );

        let broadcastId, streamId, streamKey, liveChatId, streamUrl;
        let errflag = 1;

        while (errflag === 1) {
            try {
                oauth2Client.setCredentials({
                    access_token: process.env.access_token,
                    refresh_token: process.env.refresh_token,
                });

                await oauth2Client.refreshAccessToken((err, tokens) => {
                    if (err) {
                        console.log('Error refreshing access token:', err);
                        throw err;
                    }
                    console.log('Tokens:', tokens);
                });

                const youtube = google.youtube({
                    version: 'v3',
                    auth: oauth2Client,
                });

                const liveBroadcastRequestBody = {
                    part: 'snippet,status,contentDetails',
                    resource: {
                        snippet: {
                            title: requestBody.title,
                            description: 'This is a scheduled live stream for kiosk app',
                            scheduledStartTime: requestBody.startTime,
                        },
                        status: {
                            privacyStatus: 'private',
                        },
                        contentDetails: {
                            enableAutoStart: true,
                        },
                    },
                };

                let data = await youtube.liveBroadcasts.insert(liveBroadcastRequestBody);
                broadcastId = data.data.id;
                liveChatId = data.data.snippet.liveChatId;
                streamUrl = `https://www.youtube.com/watch?v=${broadcastId}&live_chat_id=${liveChatId}`;
                console.log('broadcastId', broadcastId);

                const liveStreamRequestBody = {
                    part: 'id,snippet,cdn',
                    resource: {
                        snippet: {
                            title: requestBody.title,
                            description: 'This is a scheduled live stream for kiosk app',
                        },
                        cdn: {
                            format: '1080p',
                            resolution: '1080p',
                            frameRate: '60fps',
                            ingestionType: 'rtmp',
                        },
                    },
                };

                data = await youtube.liveStreams.insert(liveStreamRequestBody);
                streamId = data.data.id;
                console.log('streamId', streamId);
                streamKey = data.data.cdn.ingestionInfo.streamName;
                console.log('streamKey', streamKey);

                data = await youtube.liveBroadcasts.bind({
                    id: broadcastId,
                    streamId: streamId,
                    part: 'id,snippet,contentDetails,status',
                });
                console.log('final let ', data);
                errflag = 0;
            } catch (e) {
                console.log('Error while youtube api:', e);
                errflag = 1;
                console.log('waiting for 10 seconds');
                await new Promise(r => setTimeout(r, 10000));
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Live streaming started successfully',
                streamUrl,
                streamKey,
            }),
        };
    } catch (error) {
        console.error('Error in Lambda function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};
