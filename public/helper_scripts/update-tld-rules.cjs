#!/usr/bin/env node

// update the local representation of mozilla's public suffix list

const fs = require('fs');
const path = require('path');

const parseDatContent = async (datContentString) => {

    let flag = '';
    const ret = {
        icann: [],
        private: []
    };

    for await (const line of datContentString.split("\n")) {
        if (line.trim() === '') {
            continue;
        }

        if (line.match(/BEGIN ICANN DOMAINS/i)) {
            flag = 'icann';
        }

        if (line.match(/BEGIN PRIVATE DOMAINS/i)) {
            flag = 'private';
        }

        if (line.match(/^\/\//)) {
            continue;
        }

        try {
            ret[flag].push(line.trim());

        } catch (e) {
            console.error(line.trim());
            throw e;
        }
    }

    return ret;
}

fetch('https://publicsuffix.org/list/effective_tld_names.dat')
    .then(res => res.text())
    .then(async text => {
        const tldJson = await parseDatContent(text);
        fs.writeFileSync(path.join(__dirname, '../tlds.json'), JSON.stringify(tldJson));
    });
