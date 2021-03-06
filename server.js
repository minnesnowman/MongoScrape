//Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cheerio = require("cheerio");
const request = require("request");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

//Configure middleware
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scraper";


// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);


// Set Handlebars.
const exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// //Connect to Mongo DB
// mongoose.connect("mongodb://localhost/scraper")

//Routes

//GET route for home page
app.get("/", (req, res) => {
    res.render("index");
})

//GET route for scraping
app.get("/scrape", (req, res) => {
    //Make a request of Slate's h3 headlines
    request("https://slate.com/", (error, response, html) => {
        // Load the html body from request into cheerio
        var $ = cheerio.load(html);
        //Empty object to save results
        let result = {};
        //For each element with a class of "story-teaser_headline"
        $(".story-teaser").each(((i, element) => {
            // Save the headline, href, and summary of each link enclosed in the current element
            result.headline = $(element).children("a").attr("title");
            result.link = $(element).children("a").attr("href");
            //let summary = $(element).

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then((dbArticle) => {
                    console.log(dbArticle)
                })
                .catch((err) => {
                    return res.json(err);
                })
        }))
        // If we were able to successfully scrape and save an Article, send a message to the client
        res.send("Scrape Complete");
    })
})

//Route for getting all articles from the database
app.get("/articles", (req, res) => {
    //Grab every document in Articles collection
    db.Article.find({})
    .then((dbArticle) => {
        res.json(dbArticle)
    })
    .catch((err) => {
        res.json(err)
    })
})

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
      // ..and populate all of the notes associated with it
      .populate("note")
      .then(function(dbArticle) {
        // If we were able to successfully find an Article with the given id, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
  // Route for saving/updating an Article's associated Note
  app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
      .then(function(dbNote) {
        // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
      })
      .then(function(dbArticle) {
        // If we were able to successfully update an Article, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  

//Listener
app.listen(process.env.PORT || PORT, () => {
    console.log("app listening on port: " + PORT);

})