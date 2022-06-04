import express from "express";
import cors from "cors";
import expressAsyncHandler from "express-async-handler";
import authorizeRequest from "./middleware/authorizeRequest.js";
import { notFound, errorHandler } from "./middleware/errorHandlers.js";
import OAuth from "./services/OAuth.js";
import Gmail from "./services/GmailManager.js";

// DELETE BEFORE PROD
// import dotenv from "dotenv";
// dotenv.config();
// ====================

const app = express();
const oauth = new OAuth();

app.use(express.json());

// TO BE CONFIGURED WHEN DEPLOYING TO GCP
// ALLOWED_CLIENT_ORIGIN
// define the origins which can make POST request to the microservice
// app.use(cors({ origin: process.env.ALLOWED_CLIENT_ORIGIN, methods: "POST" }));
// ===================

app.get("/authenticate", (req, res) => {
    const authUrl = oauth.generateUrl();
    res.redirect(authUrl);
});

app.get(
    "/token",
    expressAsyncHandler(async (req, res) => {
        try {
            const { code } = req.query;
            const token = await oauth.generateToken(code);
            if (token) {
                res.send("Authentication successful");
            } else {
                throw new Error(
                    "An error occured while token was being generated"
                );
            }
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    })
);

app.post(
    "/mailer",
    authorizeRequest,
    expressAsyncHandler(async (req, res) => {
        try {
            const { messageObj, recipientsObj } = req.body;
            const { from, to, cc, bcc } = recipientsObj;
            if (messageObj && recipientsObj) {
                const gmail = new Gmail();
                await gmail.initialize();
                await gmail.sendEmail(from, to, cc, bcc, messageObj);
                res.send("Email has been sent");
            } else {
                throw new Error("Message and recipients object required");
            }
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    })
);

// ERROR HANDLING MIDDLEWARE
app.use(notFound);
app.use(errorHandler);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Application is listening on port ${PORT}...`);
});
