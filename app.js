// Required modules
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash"); //For use with string handling/standardising in URLs


//Initialising express
const app = express();


//Setting the view engine to use EJS
app.set("view engine", "ejs");

//To enable the parsing of Json documents
app.use(bodyParser.urlencoded({
  extended: false
}));
// This line is used for incorporating static files outside the scope of the views folder and the root such as a stylesheet in this case
app.use(express.static("public"));

//Standard connection for mongoose, on regular port and the last parameter being the name of the database you want to connect to or create
mongoose.connect("mongodb+srv://admin-ben:test123@cluster0.0n6zn.mongodb.net/todolistDB", {
  //Also included are some parameters from the console to rectify deprication issues within mongoose
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

//The creation of a schema which will be used for creating new items in the lists. This takes one parameter of "name" as type: string
const itemsSchema = {
  name: String
}

//When initiating a model it is standard to have a capitalised version of the schema as a name
const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your to-do List"
});

const item2 = new Item({
  name: "Hit the + button to add a new item"
});

const item3 = new Item({
  name: "<-- Remove an item by checking its box"
});

//A constant for initialising the default items with 3 instructional entries, created using the Item model from the itemsSchema
const defaultItems = [item1, item2, item3];

//Creates a new Schema for different lists, which takes two parameters. The name of the list, and the items within it which are from the itemsSchema
const listSchema = {
  name: String,
  items: [itemsSchema]
};

//When you create a schema, you must create a mongoose model from it
const List = mongoose.model("List", listSchema);

//Get method for the home(root) route, which used Item.find() to search the contents of the items db, and returns the found entries with the "foundItems" parameter
app.get("/", function(req, res) {
  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) {
      //If the length of the found items is 0, it will populate the list with the default items, then redirect back to the root
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err)
        } else {
          console.log("Successfully submitted entries to database")
        }
      });
      res.redirect("/");
    } else {
      //If the foundItems.length is greater than zero, it will render the list with the values of the items including the newly inserted one
      res.render("list", {
        listTitle: "Today's Tasks...",
        newItem: foundItems
      });
    }
  });
});

//Express routing for alternative urls
app.get("/:listName", function(req, res) {
  //capitalises the first letter of a list Name using lodash, so that capitalised and non-capitalised urls return the same list.
  const listName = _.capitalize(req.params.listName);

  //queries to find the name of the list matching the URL, if it doesn't exist it is created, if it does exist, it navigates to that list
  List.findOne({
    name: listName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //create a new list
        const list = new List({
          name: listName,
          items: defaultItems
        });
        list.save(function(err, result) { // Log the result parameter to the console to review it
          res.redirect("/" + listName);
        });
      } else {
        res.render("list", {
          listTitle: foundList.name,
          newItem: foundList.items
        }); //Rendering of the list, with parameters passed from list.ejs forms
      }
    }
  });
});




//Post method for the root route, that submits an item to either the default list, or a new list depending on the name of the list
app.post("/", function(req, res) {
  let itemName = req.body.listItem;
  let listName = req.body.list;
  //calls the Item schema to enter a new list item with the contents of the form within list.ejs
  const item = new Item({
    name: itemName
  });
  //If the name of the title is from the default page, it will save the new item and redirect to the page to update the list
  if (listName === "Today's Tasks...") {
    item.save();
    res.redirect("/");
  } else {
    //If the name of the title is different it will enter the items to the new list and redirect back to the same list to update it
    List.findOne({
      name: listName
    }, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    })
  }
});

//A post method for the "delete" route that is used for removing items from lists
app.post("/delete", function(req, res) {
  //Constants called from the body of the form in EJS that contains the checkbox and list item
  const checkedItem = req.body.checkbox;
  const listName = req.body.listName;

  //A function from mongoose called findByIdAndRemove which is called on the event of a checkbox being selected, it will then query the list name to remove it if it's from the root route
  if (listName === "Today's Tasks...") {
    Item.findByIdAndRemove(checkedItem, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully removed record");
        res.redirect("/");
      }
    })
  } else {
    //If it is not from the root, then the item must be "pulled" from the array of items using the mongoDB $pull operator. The key:value pair for this is the key of $pull and the value of the item to pull, which must be accessed through its array, and its own key:value pair to match the checked box
    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItem
        }
      }
    }, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    })
  }
});

app.post("/:listName", function(req,res){
  const listName = _.capitalize(req.body.newListTitle);

  List.findOne({
    name: listName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //create a new list
        const list = new List({
          name: listName,
          //Initialises the new list with an empty array rather than instructions
          items: []
        });
        list.save(function(err, result) { // Log the result parameter to the console to review it
          res.redirect("/" + listName);
        });
      } else {
        res.render("list", {
          listTitle: foundList.name,
          newItem: foundList.items
        }); //Rendering of the list, with parameters passed from list.ejs forms
      }
    }
  });

});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);


