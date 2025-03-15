import fs from 'fs';
import path from 'path';

// https://crontab.cronhub.io/

const jobs = {
    mercadolibre: {
        cron: '0 */15 * * * *', // Cron job to run the scrapper
        script: 'mercadolibre-webscraper.ts', // Object to run

        config:
        {
            // Log in info
            cookies: [
                {
                    name: 'ssid',
                    value: fs.readFileSync(path.join(__dirname, './hidden/mercadolibre.ssid')).toString(),
                    domain: '.mercadolibre.com.ar',
                    secure: true, 
                    httpOnly: true
                }
            ],

            browserArguments: [
                '--headless',
                '--disable-gpu',
            ],

            pagesToScrape: 10, // In a single category, navigate through how many pages?

            maxCategoriesAtOnce: 5, // How many categories to scrape at once?
            minTimeBetweenScrapes: 60*24 // Between the last scrapes and NOW() in MINUTES!
        }
    }
}

export { jobs };