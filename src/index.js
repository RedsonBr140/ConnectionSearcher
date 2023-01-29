const Enquirer = require('enquirer');
const Table = require('cli-table');
const axios = require('axios');
require('dotenv').config();

const enquirer = new Enquirer();
const API_URL = 'https://discord.com/api/v9';

const table = new Table({
    head: ['User', 'GitHub Account'],
    colWidths: [30, 50],
});

const fetchData = async (url, Botheader) => {
  try {
    return await axios
      .get(url, {
        headers: {
          'Authorization': Botheader ? `Bot ${process.env.BOT_TOKEN}` : process.env.USER_TOKEN
        }
      })
      .then(async (response) => {
        if (response.status === 200) {
          return response.data;
        }
      });
  } catch (error) {
    console.log(`Error: ${error.response.status} ${error.response.statusText}\nMessage: ${error.message}`);
  }
}

const prompt = async (guilds) => {
    const { server } = await enquirer.prompt({
        type: 'autocomplete',
        name: 'server',
        message: 'Which server do you want to scan?',
        choices: guilds,
    });
    return server;
};

const getServerID = async (server, guilds) => {
    return guilds.find((g) => g.name === server).id;
};

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const run = async () => {
    const guilds = await fetchData(`${API_URL}/users/@me/guilds`, true); // Bot header
    const serverName = await prompt(guilds);
    const serverID = await getServerID(serverName, guilds);
    const members = await fetchData(
        `${API_URL}/guilds/${serverID}/members?limit=${process.env.LIMIT}`,
        true
    );

    for (const member of members) {
        const user = await fetchData(
            `${API_URL}/users/${member.user.id}/profile?guild_id=${serverID}`, // User header
            false
        );
        const githubAccount = user.connected_accounts.find(
            (a) => a.type === 'github'
        );
        if (githubAccount) {
            table.push([
                `${user.user.username}#${user.user.discriminator}`,
                `https://github.com/${githubAccount.name}`,
            ]);
        }
        await delay(process.env.DELAY);
    }

    console.log(table.toString());
};

run();

module.exports = { fetchData, getServerID};
