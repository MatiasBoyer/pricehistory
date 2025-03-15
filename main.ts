/*const config = require('./config');
const mysql = require('mysql2');
const path = require('node:path');
const fs = require('node:fs');*/

import { config } from "./config";
import { jobs } from "./jobs";

import mysql from 'mysql2';
import path from 'path';
import fs from 'fs';
import { Job } from "./classes/job";
import { CronJob } from "cron";

import { ObtainCurrentDate } from "./helpers/global";


// Async JOB generation and execution
(async () => {
    const dbconn = mysql.createPool(config.histdb);

    // Jobs internal memory
    let jobs_table: {
        jobObject: Job,
        jobName: string,
        isRunning: boolean,
        cron: CronJob
    }[] = [];

    // Generate jobs
    await Object.keys(jobs).forEach(async (j) => {
        let jobconfig = jobs[j];

        try {
            const modulePath = `./jobs/${jobconfig.script}`;
            const { JobWorker } = await import(modulePath);

            JobWorker.init(dbconn);

            let internaljob = {
                jobObject: JobWorker,
                jobName: jobconfig.script,
                isRunning: false,

                cron: new CronJob(jobconfig.cron, async() => {
                    if(internaljob.isRunning)
                    {
                        console.log(`Job ${jobconfig.script} is already running, skipping...`);
                        return;
                    }
                    let id = -1;
                    internaljob.isRunning = true;

                    await dbconn.promise()
                    .query('INSERT job_header (jobName, start) VALUES (?, ?)', [jobconfig.script, ObtainCurrentDate()])
                    .then(async ([row, fields]) => {
                        id = row['insertId'];
                    });

                    console.log(`Running job ${jobconfig.script} with id ${id}...`);

                    JobWorker.jobId = id;
                    await JobWorker.run();

                    await dbconn.promise()
                    .query('UPDATE job_header SET end = ? WHERE jobId = ?', [ObtainCurrentDate(), id]);
                    console.log(`Job ${jobconfig.script} finished.`);
                    internaljob.isRunning = false;
                })
            }

            internaljob.cron.start();

            jobs_table.push(internaljob);

        } catch (err) {
            console.error(`Failed to load scrapper ${j}:`, err);
        }
    });


})();