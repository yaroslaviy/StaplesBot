const puppeteer = require('puppeteer-extra');
const fetch = require('node-fetch');
const log4js = require('log4js');
const userAgent = require('user-agents');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {user, discord} = require('./config.json');
const link = 'https://www.staples.ca/products/2956570-en-nintendo-switch-hardware-bluered-refresh';
puppeteer.use(StealthPlugin());
const Discord = require('discord.js');
const hook = new Discord.WebhookClient(discord.id, discord.token);


const logger = log4js.getLogger();
logger.level = 'info';

const body = {"ivrequest":{"postalCode":"H8N1X1","channel":"WEB","tenantId":"StaplesCA","locale":"en-CA","operationMode":"REALTIME","items":[{"itemId":"2956570","requestedquantity":1000}]}};
const isAvailable = async (link) => {
    const res = await fetch('https://staplescms.staples.ca/api/inventory', {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json',
        'Accept-Encoding':'gzip, deflate, br',
        'Content-Type':'application/json',
        'Origin':'https://www.staples.ca',
        'referer': link,
        'user-agent': (new userAgent()).toString()}
    });
    const json = await res.json();
    console.log(json);
    if(json.items[0].availablequantity>0){
        hook.send(`In stock : \n ${link}`);
        return true;
    }
    else
        return false;
    
}

const run = async (user, link) => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', 
        '--disable-setuid-sandbox',
        '--ignore-certifcate-errors'
        ],
        executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
        ,
        defaultViewport: {
          width: 1200,
          height: 1000
        }
    });

    try{
        const page = await browser.newPage();
        await page.goto('https://www.staples.ca/account/login');
        await page.waitForSelector('#customer_email');
        await page.type('#customer_email', user.email.toString());
        await page.waitForSelector('#customer_password');
        await page.type('#customer_password', user.password.toString());
        await page.click('#customer_login > div:nth-child(5) > div > button');
        logger.info('Logging in');
        await page.waitFor(5000);
        await page.goto(link);
        await page.evaluate(() => {
            document.querySelectorAll('.button.button--submit.product-form__button')[0].removeAttribute('disabled');
            document.querySelectorAll('.button.button--submit.product-form__button')[0].click();
          });
        await page.waitFor(5000);
        await page.goto('https://www.staples.ca/cart');
        await page.waitForSelector('input[name=checkout]');
        await page.click('input[name=checkout]');
        await page.waitFor(3000);
        await page.goto('https://checkout.staples.ca/payment');
        await page.evaluate(() => {
            document.querySelector('.ProcessOrderButton > button').removeAttribute('disabled');
          });
        await page.waitForSelector('.ProcessOrderButton > button');
        while(true){
            logger.log('inside loop');
            if(await isAvailable(link)) {
                await page.click('.ProcessOrderButton > button');
                logger.log('Successful order!');
                break;
            } else {
                logger.error('Not in stock');
                await page.waitFor(300000);
            }
        }

    } catch(e) {
        logger.error(e);
        await page.screenshot({path: './error.png'})
    }
}

run(user, link);