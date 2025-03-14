import mysql from 'mysql2';

export class Job {

    dbpool: mysql.Pool;

    isReady: boolean = false;
    isWorking: boolean = false;

    async init(dbpool:mysql.Pool) {
        this.dbpool = dbpool;
    }

    async scrape() {

    }
}