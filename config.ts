import fs from 'fs';
import path from 'path';

const config = {
    histdb: {
        user: fs.readFileSync(path.join(__dirname, './hidden/histdb.user')).toString(),
        password: fs.readFileSync(path.join(__dirname, './hidden/histdb.password')).toString(),
        host: fs.readFileSync(path.join(__dirname, './hidden/histdb.host')).toString(),
        port: parseInt(fs.readFileSync(path.join(__dirname, './hidden/histdb.port')).toString()),
        database: 'histdb',

        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
        idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    }
};

export { config };