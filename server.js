import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt-nodejs";

// Mongoose & Database setup:
const mongoUrl =
  process.env.MONGO_URL || "mongodb://localhost/mongo-auth-codealong";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// -----------------------------------------------
// Mongoose model setup:

const User = mongoose.model("User", {
  name: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
  },
});

// middleware to authenticate user:

const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header("Authorization") });
  if (user) {
    req.user = user;
    next();
  } else {
    res.status(401).json({ loggedOut: true });
  }
};

// Defines the port the app will run on. Defaults to 8080, but can be
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Hello world");
});


// add user endpoint - the registration endpoint:
// POST - http://localhost:8080/users
app.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Do not store plain text passwords - use bcrypt:
    const user = new User({ name, email, password: bcrypt.hashSync(password) });
    user.save();
    res.status(201).json({ id: user._id, accessToken: user.accessToken });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not create user", errors: err.errors });
  }
});

// supersecret endpoint - the protected endpoint
// restrict access - - using authenticateUser:
// GET - http://localhost:8080/secrets
app.get("/secrets", authenticateUser);
app.get("/secrets", (req, res) => {
  // can do anything here, but we just put in a message
  res.json({ secret: "All ok! - This is a super secret message" });
});


// endpoint to login a User - and check email and password:
// POST - http://localhost:8080/sessions
app.post("/sessions", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({ userId: user._id, accessToken: user.accessToken });
  } else {
    res.json({ notFound: true });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
