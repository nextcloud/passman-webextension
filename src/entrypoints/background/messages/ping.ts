import { onMessage } from '../messaging';

export interface PingResponse {
    message: string
}

onMessage('ping', message => {
    return {
        message: 'pong ' + message.id
    };
})
