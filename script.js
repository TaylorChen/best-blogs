/**
 * 1. Get original CSV of feeds
 * 2. Get follower counts for each feed
 * 3. Order by follower count
 */

const fs = require('fs');
const markdownTable = require('markdown-table');

const data = fs.readFileSync('./blogs-original.csv');
const rows = data.toString().split('\n');

const table = rows
  .map(row => row.split(',').map(column => column.trim()))
  .filter((row, i) => row.length === 4 && i !== 0)
  .map(row => row.push(-1) && row) // row[4] to store count of RSS subscribers

const {  GraphQLClient } = require('graphql-request');

const endpoint = 'https://api.feeds.pub/graphql'
const client = new GraphQLClient(endpoint, {errorPolicy: "ignore"});


const pageSize = 60;
async function getResultAndUpdateREADME() {
  // Get follower counts
  const feedLinks = table.map(row => row[2]);
  const queries = feedLinks.map((feedLink, i) => {
    if (feedLink) {
      return `f${i}: feed(id: "${feedLink}") {
        followerCount
      }`
    } else return '';
  }).filter(query => query.trim().length > 0);

  for (let i = 0; i < queries.length; i += pageSize) {
    const query = `{
        ${queries.slice(i, i + pageSize).join('\n')}
      }`

    try {
      const data = await client.request(query);

      Object.keys(data).forEach(key => {
        const index = Number(key.replace('f', ''));
        const count = data[key] ? data[key].followerCount : 0;
        table[index][4] = count;
      });
      console.log(`Got followerCount for ${i} to ${i + pageSize}`);
    } catch (error) {
      console.log(error)
    }
  }

  // Order by follower count
  table.sort((a, b) => (b[4] - a[4]) || (a[0] - b[0]));

  const getFeedsPubBtn = (feedLink, followCount) => 
    `[<img src="https://img.shields.io/static/v1?label=follow&message=${followCount}&style=social&logo=rss">](https://feeds.pub/feed/${encodeURIComponent(feedLink)})`;
  const newTable = table.map(row => {
    return [
      row[2] ? getFeedsPubBtn(row[2], row[4]) : '',
      row[0].replace(/\|/g, '&#124;'),
      row[1],
      row[3]
    ]
  });

  // update README
  const tableContentInMD = markdownTable([['<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; RSS 订阅数</p>', '简介', '链接', '标签'], ...newTable]);

  const readmeContent = ``

  fs.writeFileSync('./README.md', readmeContent, 'utf8');

  console.log('README.md 文件生成成功！');
}

getResultAndUpdateREADME()
