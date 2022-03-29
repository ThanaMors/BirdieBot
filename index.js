// Importing Required Packages
const Twit = require("twit");
// Local Imports
const config = require("./config.json");
const log = require("./Classes/log");
const { Client, Intents } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

let userIds = [];

//INITIALIZE TWITTER CLIENT
const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

//COMMAND
const prefix = "!";

//DISCORD CLIENT
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

//LOGIN TO DISCORD
client.login(process.env.DISCORD_TOKEN);

const init = () => {
  return new Promise((resolve, reject) => {
    config.Accounts.forEach((account) => {
      T.get("/users/show", { screen_name: account }, (err, data, res) => {
        if (err) {
          reject(err);
          return log.red(`ERROR: ${err}`);
        }
        userIds.push(data.id_str);
        count = config.Accounts.length;

        if (userIds.length === config.Accounts.length) {
          resolve();
        }
      });
    });
  });
};

const monitor = () => {
  // Initializing Twitter Stream
  let stream = T.stream("statuses/filter", { follow: userIds });

  // Stream Connect Event
  stream.on("connect", (request) => {
    log.cyan("Attempting to Connect to Twitter API");
  });

  // Stream Connected Event
  stream.on("connected", (res) => {
    try {
      log.cyan(
        `Monitor Connected to Twitter API. Monitoring ${config.Accounts.length} profiles.`
      );
    } catch (error) {
      console.error(error);
    }
  });

  // Stream Tweet Event

  stream.on("tweet", (tweet) => {
    // Looping through all userIds
    let url = `New tweet from: ${tweet.user.name}\nhttps://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
    if (userIds.includes(tweet.user.id_str)) {
      // Tweet Reply?
      if (!isReply(tweet) === true) {
        let channel = client.channels
          .fetch(process.env.CHANNEL_ID)
          .then((channel) => {
            channel.send(url);
          })
          .catch((err) => {
            console.log(err);
          });
        log.green("New Tweet");
      }
    }
  });

  // Stream Warning Event
  stream.on("warning", (warning) => {
    log.yellow(`Monitor Received Warning from Twitter API 
    Warning Message: ${warning}`);
  });

  // Stream Disconnect Event
  stream.on("disconnect", (disconnectMessage) => {
    log.red(`Monitor Disconnected from Twitter API Stream 
    Error Message: ${disconnectMessage}`);
  });
};

//COMMANDS
client.on("messageCreate", (message) => {
  //ACCESS FILE FUNCTION
  const accessFile = (username, addOrDelete) => {
    let rawdata = fs.readFileSync("./config.json");
    let json = JSON.parse(rawdata);
    let isAccountThere = false;

    for (let i = 0; i < json["Accounts"].length; i++) {
      if (`@${username}` === json["Accounts"][i]) {
        isAccountThere = true;
      }
    }

    //if addOrDelete === false, checks if account is not in file, pushes the username into array or returns else
    if (!addOrDelete) {
      if (isAccountThere === false) {
        json["Accounts"].push(`@${username}`);
        message.channel.send(`Added: @${username}`);
      } else {
        message.channel.send(`@${username} already exists!`);
      }
    } else {
      //if addOrDelete === true, checks if account is in file, deletes the username or returns else
      if (isAccountThere === true) {
        const index = json["Accounts"].indexOf(`@${username}`);
        if (index > -1) {
          json["Accounts"].splice(index, 1);
          message.channel.send(`Deleted: @${username}`);
        }
      } else {
        message.channel.send(`@${username} doesn't exist!`);
      }
    }

    //then saves it all
    let data = JSON.stringify(json);
    fs.writeFileSync("config.json", data);
  };

  //check to see if it doesnt start with a prefix or the author of the message is the bot itself
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  //splicing the command (example): !check help (splits the two words)
  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  let username = args[0];
  let whichCommand = false;

  //pass in 0 as an argument into access file for add
  //pass in 1 as an argument into access file for delete
  if (command === "add") {
    if (message.author.id === "229031571716308992") {
      try {
        accessFile(username, whichCommand); //args[0] is username, false is saying its the add command
      } catch (e) {
        message.channel.send(`ERROR: ${e.message}`);
      }
    } else {
      return message.channel.send("You can't use this command!");
    }
  }

  if (command === "delete") {
    try {
      whichCommand = true;
      accessFile(username, whichCommand);
    } catch (e) {
      message.channel.send(`ERROR: ${e.message}`);
    }
  }
});

log.green("Initializing Monitor!");
init().then(monitor);

//setInterval(() => addNewAccounts().then(monitor), 10000);

const isReply = (tweet) => {
  return (
    tweet.retweeted_status ||
    tweet.in_reply_to_status_id ||
    tweet.in_reply_to_status_id_str ||
    tweet.in_reply_to_user_id ||
    tweet.in_reply_to_user_id_str ||
    tweet.in_reply_to_screen_name
  );
};
