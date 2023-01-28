const Enquirer = require('enquirer');
const Table = require('cli-table');
const enquirer = new Enquirer();
require('dotenv').config();

const UserHeaders = new Headers();
const BotHeaders = new Headers();
UserHeaders.append('Authorization', `${process.env.USER_TOKEN}`);
BotHeaders.append('Authorization', `Bot ${process.env.BOT_TOKEN}`);
const URL = 'https://discord.com/api/v9';

let table = new Table({
    head: ['User', 'GitHub Account'],
    colWidths: [30, 50],
});

async function GETreq(url, headers) {
    try {
        let response = await fetch(url, { headers: headers });
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(
                `Error: ${response.status} ${
                    response.statusText
                }\nURL:${url}\nMessage:${response.json().message}`
            );
        }
    } catch (error) {
        console.error(error);
    }
}

async function getServerID() {
    const data = await GETreq(`${URL}/users/@me/guilds`, BotHeaders);
    const prompt = await enquirer.prompt({
        type: 'autocomplete',
        name: 'server',
        message: 'Which server do you want to scan?',
        choices: data,
    });
    for (let server of data) {
        if (server.name == prompt.server) {
            return server.id;
        }
    }
}

function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function run() {
    const id = await getServerID();
    GETreq(`${URL}/guilds/${id}/members?limit=${process.env.LIMIT}`, BotHeaders)
        .then(async (data) => {
            for (let mfs of data) {
                await delay(process.env.DELAY);
                GETreq(
                    `${URL}/users/${mfs.user.id}/profile?guild_id=${id}`,
                    UserHeaders
                ).then((resource) => {
                    for (let account of resource.connected_accounts) {
                        if (account.type == 'github') {
                            console.log(
                                table.push([
                                    `${resource.user.username}#${resource.user.discriminator}`,
                                    `https://github.com/${account.name}`,
                                ])
                            );
                        }
                    }
                });
            }
        })
        .then(() => {
            console.log(table.toString());
        });
}

run();
