const config = {
    histdb: {
        user: 'histdb_client',
        password: '_Ca.W_PkqfiCx1]6',
        host: 'localhost',
        port: 3307,
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