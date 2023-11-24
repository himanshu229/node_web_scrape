const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const os = require('os');
const app = express();
const port = 8000;
app.use(
  cors({
    origin: "*",
  })
);


function getLocalIpAddress() {
  const networkInterfaces = os.networkInterfaces();
  let ipAddress = null;

  // Iterate through network interfaces to find the IPv4 address
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddress = iface.address;
        break;
      }
    }
    if (ipAddress) break; // Exit loop if IP address is found
  }

  return ipAddress;
}


const scrapeArticle = async (url) => {
  try {
    // Fetch HTML content using axios
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const scrapeData = {};
    scrapeData.title = $(".u-container > h1").text();
    scrapeData.article = [];
    scrapeData.pageSize = $(".c-pagination .c-pagination__link")
      .eq(-2)
      .text()
      .replace("page", "")
      .trim("");
    $(".app-article-list-row__item").each(function () {
      let articleData = {};
      let authorsInList = [];
      $(this)
        .find('.c-author-list span[itemprop="name"]')
        .each(function () {
          authorsInList.push($(this).text());
        });
      articleData = {
        articleLink: $(this).find(".c-card__title a").attr("href"),
        headline: $(this).find(".c-card__title a").text(),
        description: $(this).find(".c-card__summary p").text() ?? null,
        authors: authorsInList,
        publishDate:
          $(this)
            .find('.c-card__section time[itemprop="datePublished"]')
            .text() ?? null,
        articleImage:
          $(this).find(".c-card__image picture img").attr("src") ?? null,
      };
      scrapeData.article.push(articleData);
    });
    return scrapeData;
  } catch (error) {
    console.error("Error fetching or parsing the HTML:", error.message);
  }
};

app.get(("/"),(req,res)=>{
    res.send("working")
})
app.get("/scrape-article", async (req, res) => {
  const { pageNo } = req.query;
  try {
    if (!!pageNo) {
      let data = await scrapeArticle(
        `https://www.nature.com/nature/research-articles?searchType=journalSearch&sort=PubDate&page=${pageNo}`
      );
      res.status(200).send({...data, pageNo:pageNo});
    } else {
      let data = await scrapeArticle(
        `https://www.nature.com/nature/research-articles`
      );
      res.status(200).send({...data, pageNo:0});
    }
  } catch (e) {
    res.status(500).json(e);
  }
});

app.listen(port, getLocalIpAddress(), () => {
  console.log(`Server listening on port http://${getLocalIpAddress()}:${port}`);
});
