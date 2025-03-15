/*const WebDriver = require('selenium-WebDriver');
const chrome = require('selenium-WebDriver/chrome');
const { until } = require('selenium-WebDriver');
const Scrapper = require('../classes/scrapperbase');*/

import { WebDriver, Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { Job } from '../classes/job';
import { jobs } from '../jobs';
import { config } from '../config';
import mysql from 'mysql2';

class MercadoLibreScrapper extends Job {

    driver: WebDriver;

    async init(dbpool: mysql.Pool) {
        this.dbpool = dbpool;

        this.Log("Initialized worker");

        const browserOptions = new chrome.Options();

        jobs.mercadolibre.config.browserArguments.forEach((arg) => {
            browserOptions.addArguments(arg);
        });

        this.driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(browserOptions)
            .build();

        // Add configured cookies
        await this.driver.get('https://www.mercadolibre.com.ar');
        await jobs.mercadolibre.config.cookies.forEach(async (cookie) => {
            await this.driver.manage().addCookie(cookie);
        });

        await this.driver.get('https://www.mercadolibre.com.ar/categorias#menu=categories');

        await this.driver.getTitle().then(title => {
            if (title != 'Categorías y Secciones en Mercado Libre')
                throw new Error('Error obtaining title');
        });

        let categories_elements = await this.driver.findElements(By.className('categories__subtitle'));
        for (let i = 0; i < categories_elements.length; i++) {
            let category = await categories_elements[i].getText();
            let href = await categories_elements[i].getAttribute('href');

            this.dbpool.promise()
                .query('SELECT categoria FROM meli_categorias WHERE categoria = ?', [category])
                .then(([rows, fields]) => {
                    rows = rows as any[];
                    if (rows.length == 0) {
                        this.dbpool.promise()
                            .query('INSERT INTO meli_categorias (categoria, url) VALUES (?, ?)', [category, href]);
                    }
                });
        }

        this.isReady = true;
        this.isWorking = false;

        this.Log("Worker ready");
    }

    async find_nextButton() {
        await this.driver.wait(until.elementLocated(By.className('andes-pagination__button andes-pagination__button--next')));
        return await this.driver.findElement(By.className('andes-pagination__button andes-pagination__button--next'));
    }

    async run() {
        if (!this.isReady || this.isWorking) {
            this.Log("Scrapper not ready");
            return;
        }

        this.isWorking = true;
        this.Log("Starting worker");

        let categories = await this.dbpool.promise()
            .query('SELECT * FROM meli_categorias WHERE (last_extract < NOW() - INTERVAL ? MINUTE) OR last_extract IS NULL LIMIT 10', 
                [jobs.mercadolibre.config.minTimeBetweenScrapes])[0] as any[];

        if(categories.length == 0)
        {
            this.isWorking = false;
            this.Log("No categories to scrape yet");
            return;
        }

        for (let c = 0; c < categories.length; c++) {
            let selected_category = categories[c];
            // load category website
            await this.driver.get(selected_category.url);

            // 'VER TODO' button
            await this.driver.wait(until.elementLocated(By.id(':R336u:')));
            let button = await this.driver.findElement(By.id(':R336u:'));//className('andes-button ui-search-layout--grid__button andes-button--large andes-button--loud andes-button--full-width'));
            await this.driver.sleep(2000); // TODO - Change me
            await button.click();

            // wait until 'SIGUIENTE' is visible
            for (let s = 0; s < jobs.mercadolibre.config.pagesToScrape; s++) {
                let next_button = await this.find_nextButton();
                // obtain all cards in website, then obtain their prices
                let cards = await this.driver.findElements(By.className('poly-card poly-card--list'));
                if (cards.length == 0)
                    cards = await this.driver.findElements(By.className('andes-card poly-card poly-card--grid-card andes-card--flat andes-card--padding-0 andes-card--animated'));
                for (let i = 0; i < cards.length; i++) {
                    let title_element = await cards[i].findElement(By.className('poly-component__title'));
                    let price_element = await cards[i]
                        .findElement(By.className('poly-component__price'))
                        .findElement(By.className('poly-price__current'))
                        .findElement(By.className('andes-money-amount__fraction'));
                    let image_element = await cards[i]
                        .findElement(By.className('poly-card__portada'))
                        .findElement(By.className('poly-component__picture'));

                    let href = new URL(await title_element.getAttribute('href'));
                    let url = href.origin + href.pathname;

                    let title = await title_element.getText();
                    let price = await price_element.getText().then((x) => x.replaceAll('.', '').replaceAll(',', ''));

                    this.driver.executeScript('arguments[0].scrollIntoView()', image_element);
                    this.driver.sleep(100);
                    let image = await image_element.getAttribute('src');

                    if (url.includes('click1.mercadolibre.com')) continue;

                    this.dbpool.promise()
                        .query('SELECT id FROM meli_header WHERE url = ?', [url]).then(([rows, fields]) => {
                            (async () => {
                                rows = rows as any[];
                                let id = -1;

                                if (rows.length == 0) {
                                    await this.dbpool.promise()
                                        .query('INSERT INTO meli_header (url, title, category, image) VALUES (?, ?, ?, ?)', [url, title, selected_category.categoria, image])
                                        .then(([rows, fields]) => {
                                            id = rows['insertId'];
                                            this.Log(`New item found: ${id} - ${title}`);
                                        });
                                }
                                else {
                                    if (rows.length > 1) this.Log(`WARNING: More than 1 row found for '${id}'`);

                                    id = rows[0]['id'];
                                }

                                await this.dbpool.promise()
                                    .query(
                                        `SELECT * FROM meli_items WHERE id = ? ORDER BY created_at DESC LIMIT 1`,
                                        [id]
                                    )
                                    .then(([rows, fields]) => {
                                        rows = rows as any[];
                                        if (rows.length == 0) {
                                            this.dbpool.promise()
                                                .query('INSERT INTO meli_items (id, price) VALUES (?, ?)', [id, price]);

                                                this.Log(`Item ${id} - $${price}`);
                                        }
                                        else {
                                            rows[0]['price'] = parseInt(rows[0]['price']);
                                            if (rows[0]['price'] != price) {
                                                this.dbpool.promise()
                                                    .query('INSERT INTO meli_items (id, price) VALUES (?, ?)', [id, price]);

                                                    this.Log(`Item ${id} - $${price}`);
                                            }
                                        }
                                    });
                            })();
                        });
                }

                await next_button.click();
                await this.driver.sleep(1000);
            }

            await this.dbpool.promise()
                .query('UPDATE meli_categorias SET last_extract = NOW() WHERE url = ?', [selected_category.url]);
        }

        this.isWorking = false;
        this.Log("Worker finished");
    }
}

export const JobWorker = new MercadoLibreScrapper();