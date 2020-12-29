const axios = require('axios');

const instance = axios.create({
    headers: {
        // todo: breeze header 配置
    }
});

module.exports = instance