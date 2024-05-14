import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { GoogleGenerativeAI } from "@google/generative-ai";

import connectDB from "./src/config/db.js";

import eventModel from "./src/models/Event.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

try {
  connectDB();
  console.log("Database connected successfully");
} catch (error) {
  console.log(error);
  process.kill(process.pid, "SIGTERM");
}

bot.start(async (ctx) => {
  const from = ctx.update.message.from;
  console.log(from);

  try {
    await ctx.replyWithSticker(
      "CAACAgIAAxkBAAN6ZkHjOogrc0hju9SbdTZwWJOp1I0AAsIBAAIWQmsK2j0dCHXgbNc1BA"
    );
    await ctx.reply(
      `Hey! ${from.username}, Welcome. I will be writing highly engaging social media posts for you🚀 Just keep feeding me with the events through the day. Let's shine on social media ✨ `
    );
  } catch (error) {
    console.log(error);
    await ctx.reply("Facing Difficulties! Try after sometime");
  }
});

bot.help(async (ctx) => {
  await ctx.reply("For support contact @Singhabhay7781");
});

bot.command("clear", async (ctx) => {
  const from = ctx.update.message.from;

  try {
    await eventModel.deleteMany({ tgId: from.id });
    await ctx.reply(
      "Cleared all the previous events. You can start fresh with new events🚀🚀"
    );
  } catch (error) {
    console.log(error);
    await ctx.reply("Facing difficulties,try after sometime");
  }
});

bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;

  const { message_id: waitingMessageId } = await ctx.reply(
    `Hey! ${from.first_name}, kindly wait for a moment. I am curating posts for you 🚀🙋`
  );

  const { message_id: stickerWaitingId } = await ctx.replyWithSticker(
    "CAACAgIAAxkBAAN0ZkHhg2mlp9H1Zh4UyvzOpcU4U6QAApAQAAJrXqhIHBpOzJ6ARZg1BA"
  );
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 60, 999);

  //get the user event
  const events = await eventModel.find({
    tgId: from.id,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (events.length === 0) {
    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(stickerWaitingId);
    ctx.reply("No events for the day");
    return;
  }

  // make google gemini api calls
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = `Write Like a human, for humans. Craft three engaging social media posts tailored for LinkedIn, Facebook, and Twitter audiences. Use simple language. Use given time labels just to understand the order of the event, don't mention the time in the posts. Each post should creatively highlight the following events. Ensure the tone is conversational and impactful. Focus on engaging the respective platform's audience, encouraging interaction, and driving interest in the events:
              ${events.map((event) => event.text).join(",")}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const output = response.text();

    //send response
    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(stickerWaitingId);

    await ctx.reply(output);

    // clear all the previous events
    try {
      await eventModel.deleteMany({ tgId: from.id });
      await ctx.reply(
        "Your post is created, and all the previous events are deleted. You can start fresh with new events. 🚀🚀"
      );
    } catch (error) {
      console.log(error);
      await ctx.reply("Facing difficulties,try after sometime");
    }
  } catch (error) {
    console.log(error);
    await ctx.reply("Facing difficulties,try after sometime");
  }
});

bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;

  try {
    await eventModel.create({
      text: message,
      tgId: from.id,
    });
    await ctx.reply(
      "Noted👍,Keep texting me your thoughts. To generate the posts,just enter the command: /generate"
    );
  } catch (error) {
    console.log(error);
    await ctx.reply("Facing Difficulties! Try after sometime!");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
