import {technicalLog} from './backend/log.js';
import {createApp} from './backend/server.js';
const port=Number(process.env.PORT||3000);
const app=createApp({origin:process.env.INFINITY_ORIGIN||`http://localhost:${port}`});
app.server.listen(port,'127.0.0.1',()=>technicalLog('server.started',{port,demo:true}));
let stopping=false;function stop(){if(stopping)return;stopping=true;app.server.close(()=>{app.close();technicalLog('server.stopped');process.exit(0);});setTimeout(()=>{app.server.closeAllConnections();},5000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
