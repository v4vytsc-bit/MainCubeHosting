const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const express = require('express')
const fs = require('fs')

// 1. CONFIG & STATE
const config = JSON.parse(fs.readFileSync('config.json'));
let randomMessages = [];
try { randomMessages = JSON.parse(fs.readFileSync('messages.json')); } catch (e) { randomMessages = ["Hello!"]; }

const webPort = process.env.PORT || 3000;
let bot, reconnectTimer = 0, status = "OFFLINE", reconnectInterval, msgTimeout;
let logs = [];
let lastMessageTime = 0; // Track the last time a message was sent

function addLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    logs.push(`[${time}] ${msg}`);
    if (logs.length > 10) logs.shift();
}

// Logic to send chat with a 60s safety check
function safeChat(message) {
    const now = Date.now();
    const waitTime = 60000 - (now - lastMessageTime);

    if (waitTime > 0) {
        addLog(`Wait ${Math.ceil(waitTime / 1000)}s to chat.`);
        return false;
    }

    bot.chat(message);
    lastMessageTime = Date.now();
    return true;
}

function startRandomMessages() {
    if (msgTimeout) clearTimeout(msgTimeout);
    
    // Choose a random time between 60 and 120 seconds
    const nextMsgTime = Math.floor(Math.random() * (120000 - 60000 + 1) + 60000);
    
    msgTimeout = setTimeout(() => {
        if (status === "ONLINE" && bot?.entity) {
            const randomMsg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
            const sent = safeChat(randomMsg);
            if (sent) addLog(`Random Msg: ${randomMsg}`);
        }
        startRandomMessages(); 
    }, nextMsgTime);
}

function createBot() {
    if (bot) { bot.removeAllListeners(); try { bot.end(); } catch (e) {} }
    if (msgTimeout) clearTimeout(msgTimeout);

    status = "CONNECTING...";
    bot = mineflayer.createBot({
        host: config.ip,
        port: parseInt(config.port),
        username: config.name,
