"use strict";
require('dotenv').config();
const loginService = require('./src/services/login.service');
const sql = require('mssql');

async function test() {
    try {
        console.log("Testing with identifier", "thuyhang_dn");
        // We'll run the actual db connection if it exists in another script
        // For now, let's just make sure syntax in backend starts cleanly.
        console.log("Require successful!");
    } catch (err) {
        console.error("Syntax Error or require error:", err);
    }
}
test();
