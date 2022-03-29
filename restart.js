module.exports.run = {
  name: "restart",
  run: async (client, message, args) => {
    if (message.username.id !== "229031571716308992") {
      return message.channel.send("You cannot use this command");
    }

    await message.channel.send("Restarting the bot...");
    process.exit();
  },
};
